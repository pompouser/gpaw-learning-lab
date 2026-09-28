# 安全边界与验证

本项目是浏览器内的教学实验室，不提供服务器端任意代码执行。网站与 GitHub 的可见性分别管理，目前均保持私有。

## 2026-09-28 加固

- 每次执行使用新的 `sandbox="allow-scripts"` iframe，未授予 `allow-same-origin`；计算在其 Blob Worker 中进行。
- 隔离页 CSP 设置 `connect-src 'none'`，由 Blob Worker 继承。执行 Python 前，先用不含用户数据的 `data:` 请求验证网络策略；未被策略阻止则拒绝执行。
- 主页面预载运行文件并检查 SHA-256。计算环境只通过内存适配器读取这些文件，不转发真实网络请求；还禁用 XMLHttpRequest、WebSocket、WebTransport、EventSource、Worker、SharedWorker 与 BroadcastChannel，作为附加防护。
- 专用 MessageChannel 传递生命周期和结果。用户代码调用普通 `postMessage()` 不会被当作可信的完成消息。
- 主页面拥有独立加载/运行超时；完成、出错、停止或超时均请求可信隔离页终止 Worker，再移除 iframe。销毁动作先于清除计时器和消费结果。旧任务的端口被关闭，不能更改新任务状态。
- 主页面独立验证结果类型、文件名、扩展名、Base64 与大小。PNG 预览验证签名及尺寸；SVG / JPEG 仅以附件下载。标准输出与错误均作为纯文本呈现。
- `scripts/runtime-lock.json` 固定所有核心 JS、WASM、标准库、包与许可证文件的哈希；恢复脚本在校验成功后才替换文件。

## 回归验证

运行 `node tests/security.mjs` 和 `node tests/verify.mjs`。前者检查超时、销毁顺序、通道与输入输出限制；后者启动真实 Pyodide 并检查数值、PNG、SciPy、CSV、错误恢复及导出文件。

浏览器复测脚本位于 `tests/fixtures/`：在代码编辑器粘贴并运行即可。`spoof_completion.py` 应只显示 REAL completion；`network_probe.py` 应报告 fetch 被拒绝。复测死循环时，请只在本项目独立测试标签页使用，确认 90 秒后结束，并能重新运行普通脚本。

## 仍需理解的限制

这不是完整虚拟机或安全认证。浏览器的 CPU / 内存没有严格配额，恶意或过大的数组仍可能耗尽标签页资源；计时器也可能受到后台标签节流影响。隔离依赖浏览器正确实现 sandbox、CSP、Worker 与 MessageChannel，无法防御浏览器自身漏洞。只运行可信代码，不导入敏感数据。

下载的脚本、CSV 与 SVG 等文件在其他软件中打开时，遵循目标软件自身的安全规则。完整 GPAW 导出脚本在用户原生环境中执行，不受这里的浏览器隔离保护。运行时依赖版本固定，但没有声称通过全量依赖漏洞审计。

涉及敏感数据的漏洞复现请私下联系仓库维护者，不要把秘密或私人数据贴到公开 issue。
