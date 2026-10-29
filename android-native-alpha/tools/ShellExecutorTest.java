package com.toolhub.floatball;

/** Run with javac/java; intentionally never calls su on the build host. */
public class ShellExecutorTest {
    private static int checks;
    private static void check(boolean value, String message) {
        if(!value) throw new AssertionError(message); checks++;
    }
    public static void main(String[] args) {
        ShellExecutor.Result ok=ShellExecutor.run("printf 'hello'",false,2000);
        check(ok.code==0 && ok.out.equals("hello"),"stdout");
        ShellExecutor.Result error=ShellExecutor.run("printf 'bad' >&2; exit 7",false,2000);
        check(error.code==7 && error.err.equals("bad"),"stderr and exit status");
        ShellExecutor.Result unicode=ShellExecutor.run("printf '中文验证'",false,2000);
        check(unicode.out.equals("中文验证"),"UTF-8");
        ShellExecutor.Result large=ShellExecutor.run("head -c 200000 /dev/zero; head -c 200000 /dev/zero >&2",false,3000);
        check(large.code==0 && large.out.length()<66000 && large.err.length()<66000,"bounded concurrent output");
        long start=System.nanoTime();
        ShellExecutor.Result timeout=ShellExecutor.run("exec sleep 8",false,100);
        check(timeout.timedOut && (System.nanoTime()-start)<3_000_000_000L,"timeout");
        boolean invalid=false;
        try {ShellExecutor.run("a\u0000b",false,1000);}catch(IllegalArgumentException e){invalid=true;}
        check(invalid,"reject NUL");
        check(new ShellExecutor.Result(0,"0\n","",false).isRoot(),"root uid validation");
        check(!new ShellExecutor.Result(0,"1000\n","",false).isRoot(),"nonroot uid validation");
        System.out.println("PASS "+checks+" ShellExecutor checks");
    }
}