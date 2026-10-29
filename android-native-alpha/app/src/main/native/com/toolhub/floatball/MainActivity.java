package com.toolhub.floatball;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.InputType;
import android.view.View;
import android.widget.*;
import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Native bootstrap UI. Does not claim upstream JS features are already migrated. */
public final class MainActivity extends Activity {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private ActionStore store;
    private ScrollView scroll;
    private String rootState="尚未检测 · 点击后向 Root 管理器请求授权";
    private boolean probing;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Ui.BG); getWindow().setNavigationBarColor(Ui.BG);
        getWindow().getDecorView().setSystemUiVisibility(0);
        store=new ActionStore(this);
        Actions.log(this,"MainActivity opened; Android="+android.os.Build.VERSION.SDK_INT);
    }
    @Override protected void onResume() { super.onResume(); render(); }
    private void render() {
        if(isFinishing() || isDestroyed()) return;
        int oldY=scroll==null?0:scroll.getScrollY();
        scroll=new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(Ui.BG);
        // Insets are applied on Android 15+, where targetSdk 35 enforces edge-to-edge.
        scroll.setOnApplyWindowInsetsListener((v,insets)-> {
            android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
            v.setPadding(bars.left,bars.top,bars.right,bars.bottom); return insets;
        });
        LinearLayout page=Ui.column(this); int p=Ui.dp(this,22); page.setPadding(p,p,p,Ui.dp(this,32)); scroll.addView(page);
        Ui.add(page,Ui.text(this,"TOOLHUB  /  NATIVE ALPHA",12,Ui.ACCENT),0);
        Ui.add(page,Ui.heading(this,"把工具，放在手边。",29),10);
        Ui.add(page,Ui.text(this,"ToolHub 悬浮工具箱 · 0.1.0-alpha\n独立运行，无需安装 ShortX。",14,Ui.MUTED),8);

        LinearLayout control=Ui.card(this);
        Ui.add(control,Ui.heading(this,FloatService.running?"●  悬浮球运行中":"○  悬浮球未启动",20),0);
        Ui.add(control,Ui.text(this,"单击展开工具面板，拖动调整位置，长按回到此页。",14,Ui.MUTED),8);
        Ui.add(control,Ui.button(this,FloatService.running?"停止悬浮球":"启动悬浮球",true,v->toggleFloat()),16);
        Ui.add(page,control,22);

        LinearLayout permissions=Ui.card(this);
        Ui.add(permissions,Ui.heading(this,"权限与 Root",19),0);
        Ui.add(permissions,Ui.text(this,"按需授权，不会在打开应用时自动执行 su。",13,Ui.MUTED),5);
        Ui.add(permissions,Ui.button(this,(Settings.canDrawOverlays(this)?"✓":"→")+"  悬浮窗权限",false,v->openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,true)),14);
        boolean notice=getSystemService(NotificationManager.class).areNotificationsEnabled();
        Ui.add(permissions,Ui.button(this,(notice?"✓":"→")+"  通知权限",false,v->{
            if(checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},20);
            else {
                Intent i=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()); safeStart(i);
            }
        }),10);
        boolean battery=getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(getPackageName());
        Ui.add(permissions,Ui.button(this,(battery?"✓":"→")+"  电池优化白名单",false,v->openSettings(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,true)),10);
        Ui.add(permissions,Ui.button(this,probing?"正在请求 Root…":"请求 / 重新检测 Root",false,v->probeRoot()),10);
        Ui.add(permissions,Ui.text(this,rootState,13,Ui.ACCENT),10);
        Ui.add(page,permissions,16);

        LinearLayout tools=Ui.card(this);
        Ui.add(tools,Ui.heading(this,"我的工具",19),0);
        Ui.add(tools,Ui.text(this,"点击执行 · 长按编辑 / 停用 / 删除\n按钮保存在本应用的 SQLite 数据库中。",13,Ui.MUTED),6);
        try {
            List<ActionStore.Action> actions=store.all(false);
            for(ActionStore.Action a:actions) {
                Button b=Ui.button(this,(a.enabled?"":"[已停用] ")+a.title+"  ·  "+a.kind+(a.root&&"shell".equals(a.kind)?" / Root":""),false,v->{
                    if(!a.enabled) { toast("该按钮已停用，长按可重新启用"); return; }
                    execute(a);
                });
                b.setOnLongClickListener(v->{ actionMenu(a); return true; }); Ui.add(tools,b,10);
            }
        } catch(Exception e) { Ui.add(tools,Ui.text(this,"数据库错误："+e.getMessage(),14,0xffffb4ab),10); }
        Ui.add(tools,Ui.button(this,"＋  新增工具",true,v->editAction(null)),14);
        Ui.add(tools,Ui.button(this,"打开 Shell 终端",false,v->terminal()),10);
        Ui.add(page,tools,16);

        LinearLayout about=Ui.card(this);
        Ui.add(about,Ui.heading(this,"初步版范围",19),0);
        Ui.add(about,Ui.text(this,"已接入：权限引导、前台悬浮服务、Root Shell、基础按钮管理。\n待迁移：原版 JS 界面、取字 / OCR、截图管理、二维码、原版配置导入与验签更新。",13,Ui.MUTED),8);
        Ui.add(about,Ui.button(this,"查看运行日志",false,v->logs()),14);
        Ui.add(page,about,16);
        Ui.add(page,Ui.text(this,"Android 14+ · Root 优先\n保活受系统和厂商限制，不承诺永不被杀。",12,Ui.MUTED),20);
        setContentView(scroll); scroll.post(()->scroll.scrollTo(0,oldY));
    }
    private void toggleFloat() {
        if(FloatService.running) { stopService(new Intent(this,FloatService.class)); scroll.postDelayed(this::render,400); return; }
        if(!Settings.canDrawOverlays(this)) {
            new AlertDialog.Builder(this).setTitle("需要悬浮窗权限").setMessage("授权后返回此页，再点击启动悬浮球。")
                .setPositiveButton("去授权",(d,w)->openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,true)).setNegativeButton("取消",null).show(); return;
        }
        try { startForegroundService(new Intent(this,FloatService.class)); scroll.postDelayed(this::render,500); }
        catch(Exception e) { showResult("启动失败",e.toString()); }
    }
    private void probeRoot() {
        if(probing) return;
        probing=true; rootState="等待 Root 管理器授权，最长 15 秒…"; render();
        worker.execute(()-> {
            ShellExecutor.Result r=ShellExecutor.run("id -u",true,15000);
            Actions.log(this,"Root probe: code="+r.code+" uid="+r.out.trim()+" error="+r.err);
            runOnUiThread(()-> {
                probing=false;
                rootState=r.isRoot()?"✓ Root 已授权 · uid=0":"Root 未就绪 · "+r.display(); render();
            });
        });
    }
    private void execute(ActionStore.Action a) {
        toast("执行："+a.title);
        Actions.run(this,a,worker,result->{ if(!isFinishing()&&!isDestroyed()) showResult(a.title,result); });
    }
    private void terminal() {
        LinearLayout box=dialogBox(); EditText input=field("Shell 命令", "id",true); box.addView(input);
        CheckBox root=new CheckBox(this); root.setText("使用 Root（su）"); root.setChecked(true); box.addView(root);
        new AlertDialog.Builder(this).setTitle("Shell 终端").setMessage("仅执行你明确输入的命令。Root 命令可修改系统，请谨慎。")
            .setView(box).setNegativeButton("取消",null).setPositiveButton("执行",(d,w)-> {
                if(input.getText().toString().trim().isEmpty()) { toast("命令不能为空"); return; }
                execute(new ActionStore.Action(0,"Shell 终端","shell",input.getText().toString(),root.isChecked(),true));
            }).show();
    }
    private void actionMenu(ActionStore.Action a) {
        new AlertDialog.Builder(this).setTitle(a.title).setItems(new String[]{"编辑",a.enabled?"停用":"启用","删除"},(d,w)-> {
            if(w==0) editAction(a);
            else if(w==1) { try { a.enabled=!a.enabled; store.save(a); render(); } catch(Exception e) { showResult("保存失败",e.toString()); } }
            else new AlertDialog.Builder(this).setTitle("删除此按钮？").setMessage(a.title)
                .setNegativeButton("取消",null).setPositiveButton("删除",(x,y)->{store.delete(a.id);render();}).show();
        }).show();
    }
    private void editAction(ActionStore.Action existing) {
        LinearLayout box=dialogBox();
        EditText title=field("按钮标题",existing==null?"":existing.title,false); box.addView(title);
        String[] kinds={"shell","app","intent","broadcast","toast"};
        Spinner kind=new Spinner(this); kind.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,kinds));
        if(existing!=null) for(int n=0;n<kinds.length;n++) if(kinds[n].equals(existing.kind)) kind.setSelection(n);
        box.addView(kind);
        TextView hint=new TextView(this); hint.setText("shell：命令；app：包名；intent：Intent URI；broadcast：Action；toast：文字"); box.addView(hint);
        EditText value=field("动作内容",existing==null?"":existing.value,true); box.addView(value);
        CheckBox root=new CheckBox(this); root.setText("Shell 使用 Root"); root.setChecked(existing==null||existing.root); box.addView(root);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(existing==null?"新增工具":"编辑工具").setView(box)
            .setNegativeButton("取消",null).setPositiveButton("保存",null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v-> {
            try {
                store.save(new ActionStore.Action(existing==null?0:existing.id,title.getText().toString().trim(),
                    kinds[kind.getSelectedItemPosition()],value.getText().toString(),root.isChecked(),existing==null||existing.enabled));
                dialog.dismiss(); render();
            } catch(Exception e) { toast("保存失败："+e.getMessage()); }
        })); dialog.show();
    }
    private LinearLayout dialogBox() {
        LinearLayout l=Ui.column(this); int p=Ui.dp(this,22); l.setPadding(p,p,p,p); return l;
    }
    private EditText field(String hint,String value,boolean multiline) {
        EditText e=new EditText(this); e.setHint(hint); e.setText(value);
        e.setInputType(InputType.TYPE_CLASS_TEXT|(multiline?InputType.TYPE_TEXT_FLAG_MULTI_LINE:0));
        if(multiline) { e.setMinLines(2); e.setMaxLines(5); } return e;
    }
    private void logs() {
        try {
            File file=new File(getFilesDir(),"runtime.log");
            showResult("运行日志",file.exists()?new String(Files.readAllBytes(file.toPath()),java.nio.charset.StandardCharsets.UTF_8):"暂无日志");
        } catch(Exception e) { showResult("日志读取失败",e.toString()); }
    }
    private void showResult(String title,String text) {
        if(isDestroyed()||isFinishing()) return;
        TextView content=new TextView(this); content.setText(text); content.setTextIsSelectable(true);
        content.setTypeface(Typeface.MONOSPACE); content.setTextSize(13); int p=Ui.dp(this,20); content.setPadding(p,p,p,p);
        ScrollView view=new ScrollView(this); view.addView(content);
        new AlertDialog.Builder(this).setTitle(title).setView(view).setPositiveButton("关闭",null)
            .setNeutralButton("复制",(d,w)-> {
                getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText(title,text)); toast("已复制");
            }).show();
    }
    private void openSettings(String action,boolean packageUri) {
        Intent i=new Intent(action); if(packageUri) i.setData(Uri.parse("package:"+getPackageName())); safeStart(i);
    }
    private void safeStart(Intent i) {
        try { startActivity(i); } catch(Exception e) { showResult("无法打开设置",e.toString()); }
    }
    private void toast(String text) { Toast.makeText(this,text,Toast.LENGTH_SHORT).show(); }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(request,permissions,results); render();
    }
    @Override protected void onDestroy() {
        worker.shutdownNow(); if(store!=null) store.close(); super.onDestroy();
    }
}