# 材料案例与数据边界

2026-10-02：五课理论教程与 Si / Al / Ag 案例。

## 结构案例

| 案例 | 结构 | 起始晶格常数 Å | 常规晶胞 / 原胞原子数 |
|---|---|---:|---:|
| Si | diamond | 5.431 | 8 / 2 |
| Al | fcc | 4.043 | 4 / 1 |
| Ag | fcc | 4.090 | 4 / 1 |

以上是构建与原生脚本的起始结构，不是本站优化后的平衡晶格。几何预览与 NumPy 脚本计算精确几何；跨边界的完整配位壳层未绘出。

## 光学机制模型

所有光学预设都是作者选择的教学参数，未经材料拟合，不是 GPAW、实验或官方预计算数据。Si 用 Lorentz 项说明束缚共振，Al 用 Drude 项说明自由电子，Ag 将两项相加说明带间响应的影响。不能将这些曲线用于定量材料预测。

采用 exp(-iωt)，能量 E=ℏω，以 eV 为单位：

    ε(E) = 1 + S/(E₀²-E²-iΓE) - Eₚ²/(E²+iΓE)

| 模型 | E₀ eV | Γ eV | S eV² | Eₚ eV |
|---|---:|---:|---:|---:|
| Si | 3.4 | 0.35 | 12 | 0 |
| Al | 3.4（无作用） | 0.30 | 0 | 15 |
| Ag | 4.5 | 0.35 | 60 | 9 |

固定对比采用共同的 0.05–25 eV、501 点网格，避免 Drude 在零能量的奇点，不随单材料滑块变化。可比较 ε₂、损失函数以及 nm⁻¹ 单位的吸收系数。没有归一化或插值。单材料介电函数绘图限制纵轴以维持可读性，损失函数单独显示；CSV 保存未裁剪值。

## 真实 GPAW 数据

本次没有新增冒充真实计算的光谱数据。第五课按所选材料生成原生脚本：Si 导出 df.csv，Al / Ag 开启带内项并额外导出 eels.csv。起始参数未宣称收敛。模板与生成的三个脚本检查 Python 语法，制作环境未执行 GPAW。

第四课接受五列 df.csv，可按用户指定的 Si / Al / Ag 标签加入对比，只显示共同能量区间。标签不是自动材料识别，网页不能核实参数或收敛性。各自采样点保留，大数据只对显示抽样；不自动平滑、归一化或平移峰位。对比区不改变上方单文件 Python 输入。

## 来源

- [ASE bulk 构建与原胞/常规晶胞](https://docs.ase-lib.org/ase/build/build.html)
- [GPAW 介电响应：Si、Al、CSV 与收敛](https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/dielectric_response/dielectric_response.html)
- [GPAW 银的 EELS](https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/eels/eels.html)
- [GPAW 介电响应理论](https://gpaw.readthedocs.io/documentation/tddft/dielectric_response.html)
- [GPAW BSE：Si 与二维 MoS₂](https://gpaw.readthedocs.io/tutorialsexercises/opticalresponse/bse_tutorial/bse_tutorial.html)

中文讲解、公式展开与练习独立编写，来源用于核对定义、方法与 API。MoS₂ 留作后续进阶内容，此版未实现二维计算。
