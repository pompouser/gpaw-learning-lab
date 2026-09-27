# GPAW 交互实验室

中文自学网站，围绕晶体结构、收敛、介电函数与材料光学性质建立可运行的 Python 实验。

私密网站：[GPAW 交互实验室](https://gpaw-learning-lab.pompouser987.chatgpt.site)

本 GitHub 仓库保存应用源码。Pyodide 及数值库二进制不纳入仓库，首次运行请执行下面的下载命令恢复；网站部署中已经包含这些运行文件。

## 能做什么

- 五个实验：硅晶体几何、收敛判断、Lorentz 光谱模型、GPAW 五列 CSV 分析、原生 GPAW 脚本导出。
- 浏览器内运行 Python 3.13、NumPy、Matplotlib 和 SciPy，支持导入 .py 和辅助数据文件。
- 自动捕获 Matplotlib 图像，显示并下载 PNG、JPEG、SVG 及生成的数据文件。
- Web Worker 执行计算，提供停止按钮与 90 秒运行超时。
- 中文教学说明、可调参数、即时预览、可编辑代码、官方资料链接与键盘操作。
- Sites 私密部署；应用本身无数据库、遥测或代码上传接口。

## 运行边界

**本网站没有在浏览器或 Sites 上执行完整 GPAW。** GPAW 需要原生扩展、数值库和 PAW 数据。第 05 课输出的脚本需在具有 GPAW 的 Linux、WSL 或集群执行，再将 df.csv 导回第 04 课。该脚本通过语法检查，但未在本项目制作环境执行原生 GPAW。默认参数用于说明流程，不是收敛参数。

光谱模型和收敛数据均明确标注为教学用途。晶体课计算精确几何。导入的 CSV 保持原数值；大文件只对 SVG 预览抽样，Python 使用完整数据。

每次运行使用新的 Python 变量命名空间，文件保留于 Worker 的临时目录。停止环境或刷新会清空临时文件；用户应下载结果。单个导入数据文件最多 10 MB，总计 30 MB；CSV 分析最多 5 MB、20,000 行。自动导出最多 12 幅绘图和 20 个新建或更新的文件（每个最多 10 MB、总计最多 20 MB）。子目录中的文件不自动导出。输入式终端交互、原生 GUI 和任意原生 Python 扩展不受支持。

内置脚本不发送用户数据。用户自行导入的 Python 可通过浏览器 API 发起网络请求，因此应仅运行可信代码。Web Worker 用于响应性与取消，不作为恶意代码安全沙箱。

## 本地使用

需要现代浏览器，支持 WebAssembly、ES modules 和 Web Workers。dist/ 是完整静态站点。

    python scripts/fetch-runtime.py
    python -m http.server 8000 --directory dist

打开 http://localhost:8000 。不要直接以 file:// 打开页面。

运行环境固定为 Pyodide 0.28.3；所有内置运行文件随网站提供，无运行时第三方 CDN 依赖。NumPy、Matplotlib 首次加载约 28 MB，SciPy 按需增加约 15 MB。下载内容可由浏览器缓存。

如从不包含运行时二进制的源码包恢复：

    python scripts/fetch-runtime.py

下载脚本校验锁文件中各 Python 包的 SHA-256。

## 验证

    node tests/verify.mjs
    python -m py_compile dist/examples/*.py dist/runner.py

测试实际启动 Pyodide，执行四个浏览器实验，验证 PNG、SciPy、导入文件、错误恢复以及导出 SVG / 文本。另检查光谱公式、收敛候选点、CSV 错误输入和路径清理。计算测试在 Node 的 WebAssembly 运行环境中执行；不等同于完整浏览器界面验证。

## 文件结构

- dist/app.mjs：界面状态、编辑器、导入导出与 Worker 生命周期
- dist/physics.mjs：即时预览的解析计算与 CSV 解析
- dist/charts.mjs：SVG 科学图表
- dist/lessons.mjs：中文教学内容与官方来源
- dist/engine.mjs、dist/python-worker.mjs、dist/runner.py：真实 Python 执行与图像捕获
- dist/examples/：独立 Python 实验
- dist/runtime/：固定版本的 Pyodide 与 Python 包
- scripts/fetch-runtime.py：可复现的运行环境下载

## 参考资料

核对日期：2026-09-27。本站内容独立编写，未复制整篇官方教程；不是 GPAW 官方产品。

- [GPAW 教程目录](https://gpaw.readthedocs.io/tutorialsexercises/tutorialsexercises.html)
- [GPAW 安装](https://gpaw.readthedocs.io/install.html)
- [ASE 构建原子结构](https://docs.ase-lib.org/ase/build/build.html)
- [GPAW 晶格常数](https://gpaw.readthedocs.io/tutorialsexercises/structureoptimization/lattice_constants/lattice_constants.html)
- [GPAW 介电响应教程](https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/dielectric_response/dielectric_response.html)
- [GPAW 介电响应理论](https://gpaw.readthedocs.io/documentation/tddft/dielectric_response.html)
- [GPAW 银的 EELS](https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/eels/eels.html)
- [Pyodide](https://pyodide.org/en/stable/)

## 第三方软件

Pyodide 和随附 Python 包保留各自许可证。包内 wheel 的 dist-info / license 文件包含其许可声明。详见 THIRD_PARTY.md。
