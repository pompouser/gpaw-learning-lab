# GPAW 交互实验室

中文自学网站，围绕晶体结构、收敛、介电函数与材料光学性质建立可运行的 Python 实验。

私密网站：[GPAW 交互实验室](https://gpaw-learning-lab.pompouser987.chatgpt.site)

GitHub 仓库保存源码，运行文件通过下方的恢复脚本获取；网站部署已经包含这些运行文件。

## 能做什么

- 五课均提供「理论教程 / 交互实验」双视图：几何、收敛、光谱、CSV 分析与原生 GPAW。教程包括前置知识、逐步推导、代码对应、练习与官方来源。
- Si / Al / Ag 晶体几何、光学机制模型及原生脚本；每个材料独立保留当前会话中的参数和代码草稿。
- 固定默认模型的三材料对比：ε₂、损失函数、吸收系数；支持生成 Python 与 CSV。
- 用户五列 CSV 的跨材料对比：保留原始采样点，只显示共同范围，不归一化。详见 [MATERIALS.md](MATERIALS.md)。
- 浏览器内运行 Python 3.13、NumPy、Matplotlib 和 SciPy，支持导入 .py 和辅助数据文件。
- 自动捕获 Matplotlib 图像，预览尺寸受限的 PNG，并下载 PNG、JPEG、SVG 及生成的数据文件。
- 每次运行创建独立的隔离 iframe / Web Worker，提供停止按钮与 90 秒运行超时。
- 中文教学说明、可调参数、即时预览、可编辑代码、官方资料链接与键盘操作。
- Sites 私密部署；应用本身无数据库、遥测或代码上传接口。

## 运行边界

**本网站没有在浏览器或 Sites 上执行完整 GPAW。** GPAW 需要原生扩展、数值库和 PAW 数据。第 05 课按 Si / Al / Ag 输出的脚本需在具有 GPAW 的 Linux、WSL 或集群执行，再将 df.csv 导回第 04 课。该脚本通过语法检查，但未在本项目制作环境执行原生 GPAW。默认参数用于说明流程，不是收敛参数。Al / Ag 显式启用带内项并设置 rate，另输出有限 q 的 EELS。

光谱预设与收敛数据均明确标注为教学用途，未加入真实 GPAW 预计算光谱。晶体课计算精确几何。导入的 CSV 保持原数值；大文件只对 SVG 预览抽样，Python 使用完整数据。

每次运行创建新的 Python 环境，并重新载入用户添加的数据文件。运行结束、停止或超时后销毁整个计算环境；生成文件不会带入下一次运行，需要先下载再导入。导入文件留在主页面的当前会话，刷新后清空。单个输入最多 10 MB、总计 30 MB、最多 100 个文件；代码最多 2 MB；CSV 分析最多 5 MB、20,000 行。输出最多 12 幅图和 20 个文件，合计最多 20 MB；单个最多 10 MB。PNG 预览最多 4096 × 4096 且总像素不超过 1600 万；JPEG / SVG 仅下载，不内嵌渲染。

计算在不具有站点同源权限的 sandbox iframe 中启动。Blob Worker 继承 `connect-src 'none'`，先自检策略，再执行 Python；运行文件先由主页面下载、校验并传入，只能从内存读取。禁止外部联网、远程包安装以及运行时从 URL 下载数据。支持随站点提供的标准库、NumPy、Matplotlib、SciPy 及其依赖。

专用 MessageChannel 与普通 Worker postMessage 分开。主页面独立计时，结束时先停止并销毁环境，再处理输出；结果须通过类型、文件名、大小与图像尺寸校验。**这些措施不是完整虚拟机或浏览器漏洞防护。** CPU / 内存不能硬配额，复杂代码仍可能使标签页卡顿；只运行可信代码，不导入敏感数据。详见 [SECURITY.md](SECURITY.md)。

## 本地使用

需要现代浏览器，支持 WebAssembly、ES modules 和 Web Workers。dist/ 是完整静态站点。

    python scripts/fetch-runtime.py
    python -m http.server 8000 --directory dist

打开 http://localhost:8000 。不要直接以 file:// 打开页面。

运行环境固定为 Pyodide 0.28.3；所有内置运行文件随网站提供，无运行时第三方 CDN 依赖。首次预载约 43 MB，包含 SciPy。后续运行复用下载内容，但不复用 Python 状态；首次准备和每次启动会比长期共用环境更慢。

如从不包含运行时二进制的源码包恢复：

    python scripts/fetch-runtime.py

下载脚本依据提交到源码的 scripts/runtime-lock.json 校验所有核心 JS、WASM、标准库和 Python 包的 SHA-256。

## 验证

    node tests/security.mjs
    node tests/verify.mjs
    python -m py_compile dist/examples/*.py dist/runner.py

测试实际启动 Pyodide，执行四个浏览器实验，验证 PNG、SciPy、导入文件、错误恢复以及导出 SVG / 文本。另检查光谱公式、收敛候选点、CSV 错误输入和路径清理。安全测试覆盖独立超时、消息通道、销毁顺序、输入输出限制、内存文件访问规则和 SHA-256。tests/fixtures/ 提供可在浏览器编辑器复测的无敏感数据安全用例。

## 2026-10-02 课程扩展

默认进入理论教程；切换理论和实验使用同一实验 DOM，保留编辑器、参数和当前结果。切换材料保存代码草稿与参数，输出区域重置以避免误认旧材料结果。数据仅保留当前页面会话。

三材料教学模型与 JavaScript 预览 / Python 数值进行逐点比对；原生 GPAW 脚本只进行语法与配置检查，不能据此声称计算已成功。既有网络隔离、独立超时与输出验证继续保留。

## 文件结构

- dist/app.mjs：界面状态、编辑器、导入导出与 Worker 生命周期
- dist/physics.mjs：即时预览的解析计算与 CSV 解析
- dist/charts.mjs：SVG 科学图表
- dist/lessons.mjs、dist/tutorials.mjs：课程配置、详细教程与官方来源
- dist/materials.mjs：材料结构、机制模型和对比数据处理
- dist/sandbox.mjs、dist/runtime-security.mjs：隔离环境、主页面计时与输出校验
- dist/offline-runtime.mjs、dist/sha256.mjs：内存运行文件与完整性校验
- dist/engine.mjs、dist/python-worker.mjs、dist/runner.py：真实 Python 执行与图像捕获
- dist/examples/：独立 Python 实验
- dist/runtime/：固定版本的 Pyodide 与 Python 包
- scripts/fetch-runtime.py：可复现的运行环境下载

## 参考资料

核对日期：2026-10-02。本站内容独立编写，未复制整篇官方教程；不是 GPAW 官方产品。

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
