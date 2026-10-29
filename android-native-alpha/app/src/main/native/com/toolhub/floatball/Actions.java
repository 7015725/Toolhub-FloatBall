package com.toolhub.floatball;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;

final class Actions {
    static synchronized void log(Context c, String text) {
        Log.i("ToolHub", text);
        try {
            File f=new File(c.getFilesDir(),"runtime.log");
            boolean append=f.length()<1024*1024;
            try(FileOutputStream out=new FileOutputStream(f,append)) {
                out.write((new java.util.Date()+"  "+text+"\n").getBytes(StandardCharsets.UTF_8));
            }
        } catch(Exception e) { Log.e("ToolHub","Log write failed",e); }
    }
    static void run(Context c, ActionStore.Action a, ExecutorService worker, Consumer<String> result) {
        Handler main=new Handler(Looper.getMainLooper());
        if ("shell".equals(a.kind)) {
            worker.execute(() -> {
                ShellExecutor.Result r=ShellExecutor.run(a.value,a.root,30000);
                // 仅失败时记录受限错误摘要，不记录命令或标准输出。
                String error=r.err==null?"":r.err.replace('\n',' ').replace('\r',' ');
                log(c,"Action="+a.title+" code="+r.code+" timeout="+r.timedOut
                    +" stderrChars="+error.length()
                    +((r.code!=0||r.timedOut)?" error="+error.substring(0,Math.min(512,error.length())):""));
                main.post(() -> result.accept(r.display()));
            });
            return;
        }
        try {
            switch(a.kind) {
                case "app": {
                    Intent i=c.getPackageManager().getLaunchIntentForPackage(a.value.trim());
                    if(i==null) throw new IllegalArgumentException("未找到可启动的应用："+a.value);
                    c.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); break;
                }
                case "intent":
                    c.startActivity(Intent.parseUri(a.value,Intent.URI_INTENT_SCHEME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); break;
                case "broadcast":
                    c.sendBroadcast(new Intent(a.value.trim())); break;
                case "toast": Toast.makeText(c,a.value,Toast.LENGTH_LONG).show(); break;
                default: throw new IllegalArgumentException("此动作尚未迁移："+a.kind);
            }
            log(c,"Action="+a.title+" dispatched"); result.accept("已发送："+a.title);
        } catch(Exception e) {
            log(c,"Action failed: "+e); result.accept("执行失败："+e.getMessage());
        }
    }
    private Actions() {}
}