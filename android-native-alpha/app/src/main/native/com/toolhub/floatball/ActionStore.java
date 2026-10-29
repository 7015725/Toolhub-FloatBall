package com.toolhub.floatball;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.util.ArrayList;
import java.util.List;

/** Alpha schema is deliberately separate from the upstream ToolHub database. */
final class ActionStore extends SQLiteOpenHelper {
    static final class Action {
        long id; String title, kind, value; boolean root, enabled;
        Action(long id, String title, String kind, String value, boolean root, boolean enabled) {
            this.id=id; this.title=title; this.kind=kind; this.value=value; this.root=root; this.enabled=enabled;
        }
    }
    ActionStore(Context c) { super(c, "toolhub-native-alpha.db", null, 1); }
    @Override public void onConfigure(SQLiteDatabase db) { db.setForeignKeyConstraintsEnabled(true); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE actions (_id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, use_root INTEGER NOT NULL DEFAULT 1, enabled INTEGER NOT NULL DEFAULT 1)");
        seed(db, "Root 身份", "shell", "id", true);
        seed(db, "设备信息", "shell", "getprop ro.product.model; getprop ro.build.version.release", false);
        seed(db, "系统设置", "intent", "intent:#Intent;action=android.settings.SETTINGS;end", false);
    }
    private void seed(SQLiteDatabase db, String title, String kind, String value, boolean root) {
        db.insertOrThrow("actions", null, values(new Action(0,title,kind,value,root,true)));
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Never silently drop user actions on an unknown migration.
        throw new IllegalStateException("Unsupported schema migration " + oldVersion + " -> " + newVersion);
    }
    private ContentValues values(Action a) {
        ContentValues v=new ContentValues(); v.put("title",a.title); v.put("kind",a.kind);
        v.put("value",a.value); v.put("use_root",a.root ? 1:0); v.put("enabled",a.enabled ? 1:0); return v;
    }
    List<Action> all(boolean enabledOnly) {
        List<Action> result=new ArrayList<>();
        try (Cursor c=getReadableDatabase().query("actions",null,enabledOnly ? "enabled=1":null,null,null,null,"_id ASC")) {
            while(c.moveToNext()) result.add(new Action(c.getLong(c.getColumnIndexOrThrow("_id")),
                c.getString(c.getColumnIndexOrThrow("title")), c.getString(c.getColumnIndexOrThrow("kind")),
                c.getString(c.getColumnIndexOrThrow("value")), c.getInt(c.getColumnIndexOrThrow("use_root"))==1,
                c.getInt(c.getColumnIndexOrThrow("enabled"))==1));
        }
        return result;
    }
    void save(Action a) {
        if (a.title.trim().isEmpty() || a.value.trim().isEmpty()) throw new IllegalArgumentException("标题和内容不能为空");
        if (a.id==0) a.id=getWritableDatabase().insertOrThrow("actions",null,values(a));
        else if (getWritableDatabase().update("actions",values(a),"_id=?",new String[]{Long.toString(a.id)})!=1)
            throw new IllegalStateException("按钮已不存在");
    }
    void delete(long id) { getWritableDatabase().delete("actions","_id=?",new String[]{Long.toString(id)}); }
}