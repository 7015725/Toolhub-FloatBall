package com.toolhub.floatball;

import android.app.*;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Explicit, user-controlled specialUse foreground service; no hidden root daemon. */
public final class FloatService extends Service {
    static volatile boolean running;
    private static final String STOP="com.toolhub.floatball.STOP";
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private WindowManager wm;
    private TextView ball;
    private LinearLayout panel;
    private WindowManager.LayoutParams ballParams;
    private ActionStore store;
    private SharedPreferences prefs;
    private int width,height,size;
    private float downX,downY;
    private int startX,startY;
    private boolean moved,longPressed;
    private final Runnable longPress=()->{longPressed=true;openMain();};

    @Override public void onCreate() {
        super.onCreate();
        wm=getSystemService(WindowManager.class); store=new ActionStore(this);
        prefs=getSharedPreferences("float-position",MODE_PRIVATE);
        NotificationChannel channel=new NotificationChannel("toolhub_running","悬浮工具运行状态",NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("持续悬浮球服务，通知中可一键停止");
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if(intent!=null && STOP.equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        if(!Settings.canDrawOverlays(this)) { Actions.log(this,"Overlay permission missing"); stopSelf(); return START_NOT_STICKY; }
        try {
            Intent open=new Intent(this,MainActivity.class);
            PendingIntent content=PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            PendingIntent stop=PendingIntent.getService(this,1,new Intent(this,FloatService.class).setAction(STOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            Notification notice=new Notification.Builder(this,"toolhub_running")
                .setSmallIcon(R.drawable.ic_stat_toolhub).setContentTitle("ToolHub 悬浮球运行中")
                .setContentText("点击打开工具箱 · 可从此处停止").setContentIntent(content).setOngoing(true)
                .addAction(new Notification.Action.Builder(null,"停止悬浮球",stop).build()).build();
            startForeground(41,notice,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            if(ball==null) attachBall(); running=true;
            Actions.log(this,"FloatService foreground and overlay attached");
            return START_STICKY;
        } catch(Exception e) {
            Actions.log(this,"FloatService start failed: "+e);
            Toast.makeText(this,"悬浮球启动失败："+e.getMessage(),Toast.LENGTH_LONG).show();
            stopSelf(); return START_NOT_STICKY;
        }
    }
    private void bounds() {
        android.graphics.Rect rect=wm.getCurrentWindowMetrics().getBounds();
        width=rect.width(); height=rect.height(); size=Ui.dp(this,50);
    }
    private WindowManager.LayoutParams params(int w,int h) {
        WindowManager.LayoutParams p=new WindowManager.LayoutParams(w,h,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,PixelFormat.TRANSLUCENT);
        p.gravity=Gravity.TOP|Gravity.LEFT; return p;
    }
    private void attachBall() {
        bounds(); ball=Ui.heading(this,"T",23); ball.setGravity(Gravity.CENTER);
        ball.setTextColor(Ui.BG); ball.setBackground(Ui.shape(this,Ui.ACCENT,25)); ball.setElevation(Ui.dp(this,8));
        ball.setContentDescription("ToolHub 悬浮球，点击展开，长按主页");
        ballParams=params(size,size);
        ballParams.x=prefs.getBoolean("right",true)?Math.max(0,width-size):0;
        ballParams.y=Math.max(0,Math.min(height-size,(int)(prefs.getFloat("y",0.4f)*height)));
        ball.setOnTouchListener((v,e)-> {
            switch(e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    downX=e.getRawX(); downY=e.getRawY(); startX=ballParams.x; startY=ballParams.y;
                    moved=false;longPressed=false;main.postDelayed(longPress,550);return true;
                case MotionEvent.ACTION_MOVE:
                    float dx=e.getRawX()-downX,dy=e.getRawY()-downY;
                    if(!moved&&Math.hypot(dx,dy)>ViewConfiguration.get(this).getScaledTouchSlop()) {
                        moved=true;main.removeCallbacks(longPress);closePanel();
                    }
                    if(moved) {
                        ballParams.x=Math.max(0,Math.min(width-size,startX+(int)dx));
                        ballParams.y=Math.max(0,Math.min(height-size,startY+(int)dy));
                        updateBall();
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    main.removeCallbacks(longPress);
                    if(moved) snap(); else if(!longPressed) { v.performClick();togglePanel(); }
                    return true;
                case MotionEvent.ACTION_CANCEL:main.removeCallbacks(longPress);if(moved)snap();return true;
                default:return false;
            }
        });
        wm.addView(ball,ballParams);
    }
    private void updateBall() {
        try { if(ball!=null) wm.updateViewLayout(ball,ballParams); }
        catch(Exception e) { Actions.log(this,"Overlay update failed: "+e);stopSelf(); }
    }
    private void snap() {
        boolean right=ballParams.x+size/2>width/2;ballParams.x=right?Math.max(0,width-size):0;updateBall();
        prefs.edit().putBoolean("right",right).putFloat("y",ballParams.y/(float)Math.max(1,height)).apply();
    }
    private void togglePanel() { if(panel!=null)closePanel(); else showPanel(); }
    private void showPanel() {
        if(ball==null)return;
        LinearLayout card=Ui.card(this); panel=card; card.setElevation(Ui.dp(this,10));
        Ui.add(card,Ui.heading(this,"ToolHub",21),0);
        Ui.add(card,Ui.text(this,"独立工具面板 · Alpha",12,Ui.MUTED),4);
        LinearLayout actions=Ui.column(this); ScrollView list=new ScrollView(this);list.addView(actions);
        try {
            for(ActionStore.Action a:store.all(true)) Ui.add(actions,Ui.button(this,a.title,false,v->{
                closePanel();
                if("shell".equals(a.kind)) {
                    Toast.makeText(this,"执行："+a.title,Toast.LENGTH_SHORT).show();
                    Actions.run(this,a,worker,result->{if(running)showOutput(a.title,result);});
                } else Actions.run(this,a,worker,result->Toast.makeText(this,result,Toast.LENGTH_SHORT).show());
            }),8);
        } catch(Exception e) { Ui.add(actions,Ui.text(this,"读取按钮失败："+e.getMessage(),13,Ui.TEXT),8); }
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,Math.min(Ui.dp(this,230),height/3));lp.topMargin=Ui.dp(this,8);card.addView(list,lp);
        Ui.add(card,Ui.button(this,"打开主页 / 管理工具",true,v->openMain()),12);
        Ui.add(card,Ui.button(this,"收起",false,v->closePanel()),8);
        attachPanel(card);
    }
    private void showOutput(String title,String text) {
        closePanel();
        LinearLayout card=Ui.card(this);panel=card;
        Ui.add(card,Ui.heading(this,title,19),0);
        TextView output=Ui.text(this,text,12,Ui.TEXT);output.setTextIsSelectable(false);
        ScrollView scroll=new ScrollView(this);scroll.addView(output);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,Math.min(Ui.dp(this,240),height/3));p.topMargin=Ui.dp(this,10);card.addView(scroll,p);
        Ui.add(card,Ui.button(this,"关闭",true,v->closePanel()),12);attachPanel(card);
    }
    private void attachPanel(LinearLayout card) {
        int panelWidth=Math.max(Ui.dp(this,180),Math.min(Ui.dp(this,310),width-Ui.dp(this,24)));
        WindowManager.LayoutParams p=params(panelWidth,-2);p.flags|=WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
        p.x=Math.max(0,Math.min(width-panelWidth,ballParams.x>width/2?width-size-panelWidth-Ui.dp(this,8):size+Ui.dp(this,8)));
        p.y=Math.max(Ui.dp(this,12),Math.min(height-Ui.dp(this,440),ballParams.y-Ui.dp(this,80)));
        card.setOnTouchListener((v,e)->{if(e.getAction()==MotionEvent.ACTION_OUTSIDE) {closePanel();return true;}return false;});
        try { wm.addView(card,p); }
        catch(Exception e) {panel=null;Actions.log(this,"Panel attach failed: "+e);Toast.makeText(this,"无法打开面板",Toast.LENGTH_SHORT).show();}
    }
    private void closePanel() {
        if(panel!=null) {try{wm.removeView(panel);}catch(Exception ignored){}panel=null;}
    }
    private void openMain() {
        closePanel();
        try {startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP));}
        catch(Exception e) {Toast.makeText(this,"请从通知打开主页",Toast.LENGTH_SHORT).show();}
    }
    @Override public void onConfigurationChanged(Configuration config) {
        super.onConfigurationChanged(config);closePanel();bounds();
        if(ballParams!=null){ballParams.y=Math.min(ballParams.y,Math.max(0,height-size));snap();}
    }
    @Override public void onDestroy() {
        running=false; main.removeCallbacksAndMessages(null); closePanel();
        if(ball!=null) {try{wm.removeView(ball);}catch(Exception ignored){}ball=null;}
        worker.shutdownNow();if(store!=null)store.close();stopForeground(STOP_FOREGROUND_REMOVE);
        Actions.log(this,"FloatService stopped and windows removed");super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) {return null;}
}