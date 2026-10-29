package com.toolhub.floatball;

import android.app.Instrumentation;
import android.os.Bundle;
import android.content.Context;
import java.util.List;

/** Debug-only, shell-invoked regression checks. Does not tap other apps or execute privileged mutations. */
public final class SmokeInstrumentation extends Instrumentation {
    private Bundle args;
    private int checks;
    private void check(boolean condition,String name) {
        if(!condition) throw new AssertionError(name); checks++;
    }
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments);args=arguments;start(); }
    @Override public void onStart() {
        Bundle result=new Bundle();ActionStore store=null;long testId=0;
        try {
            Context c=getTargetContext(); store=new ActionStore(c);
            check(!store.all(false).isEmpty(),"database seeded");
            ActionStore.Action a=new ActionStore.Action(0,"__smoke_test__","toast","smoke",false,true);
            store.save(a);testId=a.id;check(testId>0,"insert");
            long savedId=testId;
            check(store.all(false).stream().anyMatch(x->x.id==savedId&&x.title.equals("__smoke_test__")),"read after insert");
            a.title="__edited__";a.enabled=false;store.save(a);
            check(store.all(false).stream().anyMatch(x->x.id==savedId&&x.title.equals("__edited__")&&!x.enabled),"update");
            check(store.all(true).stream().noneMatch(x->x.id==savedId),"enabled filter");
            store.delete(testId);testId=0;
            check(store.all(false).stream().noneMatch(x->x.id==savedId),"delete");
            ShellExecutor.Result shell=ShellExecutor.run("printf toolhub-smoke; printf stderr-smoke >&2; exit 7",false,3000);
            check(shell.code==7&&shell.out.equals("toolhub-smoke")&&shell.err.equals("stderr-smoke"),"app sandbox shell and status");
            ShellExecutor.Result identity=ShellExecutor.run("id -u",false,3000);
            check(identity.code==0&&!identity.out.trim().equals("0"),"app has ordinary uid by default");
            result.putString("ordinary_uid",identity.out.trim());
            if(args!=null&&"true".equals(args.getString("root"))) {
                ShellExecutor.Result root=ShellExecutor.run("id -u",true,15000);
                result.putString("root",root.isRoot()?"GRANTED uid=0":"NOT_GRANTED: "+root.display());
            }
            result.putString("stream","PASS "+checks+" Android smoke checks\n");finish(-1,result);
        } catch(Throwable e) {
            result.putString("stream","FAIL after "+checks+" checks: "+e);finish(0,result);
        } finally {
            if(store!=null){if(testId>0)store.delete(testId);store.close();}
        }
    }
}