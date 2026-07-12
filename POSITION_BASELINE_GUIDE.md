# ToolHub 真机固定位置基线采集

本工具用于在 Android / Termux 真机上记录悬浮球固定位置行为，为后续删除 `th_15_extra.js` 中的 B 级过渡实现提供删除前基线。

它不会修改 ToolHub 配置、触发手势或改写运行时模块，只读取现有 `init.log`，并由用户人工执行场景和判定结果。

## 前置条件

- 当前仓库已更新到最新 `main`。
- Termux 已安装 Python。
- Termux 能通过 KSU 获取 root 权限。
- ToolHub 能正常启动，并持续写入 `ToolHub/logs/init.log`。

```bash
pkg install python
cd ~/Toolhub-FloatBall
git pull origin main
```

## 查看测试场景

```bash
python3 scripts/collect_position_baseline.py --list-scenarios
```

当前包含 12 个场景：

1. 左侧 22% 冷启动。
2. 右侧 22% 冷启动。
3. 右侧 0%。
4. 右侧 50%。
5. 右侧 100%。
6. 屏幕旋转或配置变化。
7. 修改悬浮球尺寸。
8. 动画开启。
9. 动画关闭。
10. 主面板开关。
11. 指针启动与松手归位。
12. 设置内重启 ToolHub。

## 开始完整采集

```bash
python3 scripts/collect_position_baseline.py
```

脚本会：

1. 尝试使用 `su --mount-master -c` 或 `su -c` 查找并读取 `ToolHub/logs/init.log`。
2. 显示每个场景的准备和操作说明。
3. 在操作前后读取日志增量。
4. 解析以下关键记录：
   - `apply configured ball position reason=... side=... percent=... y=...`
   - `ball x=... y=... sizeDp=...`
   - 位置应用、动画、启动相关异常。
5. 要求人工选择“通过、失败、跳过”。
6. 每完成一个场景立即保存结果。

发现多个日志时，脚本会要求选择。自动查找失败时可直接指定：

```bash
python3 scripts/collect_position_baseline.py \
  --log /data/system/shortx_xxx/ToolHub/logs/init.log
```

## 只采集部分场景

`--scenario` 可以重复使用：

```bash
python3 scripts/collect_position_baseline.py \
  --scenario cold_left_22 \
  --scenario cold_right_22 \
  --scenario pointer_release \
  --scenario settings_restart
```

## 输出文件

默认输出到 Termux 下载目录：

```text
~/storage/downloads/toolhub-position-baseline-YYYYMMDD-HHMMSS/
```

包含：

```text
position-baseline.md
position-baseline.json
position-baseline-evidence.log
```

- `position-baseline.md`：人工结果、关键坐标和自动核对摘要。
- `position-baseline.json`：完整机器可读会话。
- `position-baseline-evidence.log`：每个场景的原始相关日志。

可指定输出目录：

```bash
python3 scripts/collect_position_baseline.py \
  --output-dir ~/storage/downloads/toolhub-position-before-cleanup
```

## 判定标准

每个场景都要同时检查：

- 侧边是否正确。
- 高度是否正确且不越界。
- 半隐藏方向和可见宽度是否正确。
- 主面板、尺寸变化、动画和屏幕变化后是否漂移。
- 指针结束后是否回到配置位置。
- 设置内重启是否与冷启动一致。
- 日志中是否出现位置应用或动画异常。

日志中的 `side`、`percent` 和 `y` 只用于辅助核对。最终结果以真机可见行为和触摸体验为准。

只要存在以下任一情况，就不能进入 B 级过渡实现删除：

- 任一必测场景失败。
- 自动核对发现侧边或百分比不匹配。
- 出现位置应用、动画或启动异常。
- 关键场景没有可解释的日志证据。
- 删除前基线尚未完整保存。

## CI 自检

仓库 CI 只运行无设备依赖的解析器自检：

```bash
python3 scripts/collect_position_baseline.py --self-test
```

该自检验证场景定义、日志增量处理、坐标解析、异常识别和报告生成，不替代真机测试。

## 与加载期审查的关系

`POSITION_TRANSITION_AUDIT.md` 已证明 B 级实现不会在模块加载窗口内进入实例运行链。本工具补充剩余的真机行为基线。

只有静态加载期证明和真机基线均通过，才可以开始下一轮整组删除。
