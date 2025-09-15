# KaTeX 数学公式测试

## 行内数学公式

这是一个行内数学公式：$E = mc^2$，它应该显示在文本中。

勾股定理：$a^2 + b^2 = c^2$

求和公式：$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$

欧拉公式：$e^{i\pi} + 1 = 0$

圆的方程：$x^2 + y^2 = z^2$

另一个行内公式：$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$

## 块级数学公式

### 基础公式

#### 二次方程

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

#### 积分

$$
\int_{0}^{\infty} \frac{\sin(x)}{x} dx = \frac{\pi}{2}
$$

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\int_0^\infty e^{-x} dx = 1
$$

#### 傅里叶变换

$$
f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi) e^{2 \pi i \xi x} d\xi
$$

### 矩阵

#### 基础矩阵

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

$$
A = \begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}
$$

#### 不同类型的矩阵

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\quad
\begin{vmatrix}
a & b \\
c & d
\end{vmatrix}
\quad
\begin{Vmatrix}
a & b \\
c & d
\end{Vmatrix}
$$

#### 复杂矩阵

$$
\begin{bmatrix}
\frac{1}{2} & \sqrt{3} & 0 \\
-\sqrt{3} & \frac{1}{2} & 0 \\
0 & 0 & 1
\end{bmatrix}
$$

### 高级数学结构

#### 麦克斯韦方程组

$$
\begin{aligned}
\nabla \times \vec{B} -\, \frac{1}{c}\, \frac{\partial\vec{E}}{\partial t} &= \frac{4\pi}{c}\vec{j} \\
\nabla \cdot \vec{E} &= 4 \pi \rho \\
\nabla \times \vec{E}\, +\, \frac{1}{c}\, \frac{\partial\vec{B}}{\partial t} &= \vec{0} \\
\nabla \cdot \vec{B} &= 0
\end{aligned}
$$

#### 求和与乘积

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\sum_{i=1}^{n} \sum_{j=1}^{m} a_{ij} = \sum_{j=1}^{m} \sum_{i=1}^{n} a_{ij}
$$

$$
\prod_{i=1}^{n} i = n!
$$

#### 极限和导数

$$
\lim_{x \to 0} \frac{\sin(x)}{x} = 1
$$

$$
\frac{d}{dx} \left( x^n \right) = n x^{n-1}
$$

$$
\frac{\partial f}{\partial x} = \lim_{h \to 0} \frac{f(x+h, y) - f(x, y)}{h}
$$

#### 分式和根式

$$
\frac{\partial f}{\partial x} = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$

$$
\frac{\frac{a}{b}}{\frac{c}{d}} = \frac{ad}{bc}
$$

$$
\sqrt{\sqrt{x} + \sqrt{y}} = (x^{1/2} + y^{1/2})^{1/2}
$$

### 特殊数学符号

#### 希腊字母

$$
\alpha + \beta = \gamma \quad \text{其中} \quad \alpha, \beta, \gamma \in \mathbb{R}
$$

$$
\alpha, \beta, \gamma, \delta, \epsilon, \zeta, \eta, \theta, \iota, \kappa, \lambda, \mu
$$

#### 特殊符号

$$
\infty, \partial, \nabla, \forall, \exists, \emptyset, \pm, \mp, \times, \div, \cdot
$$

#### 集合与逻辑

$$
A \cup B = \{x : x \in A \text{ 或 } x \in B\}
$$

$$
A \cup B = \{x \mid x \in A \text{ 或 } x \in B\}
$$

$$
P \land Q \implies R \equiv \neg P \lor \neg Q \lor R
$$

#### 方程组

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### 复数

$$
z = a + bi = r(\cos \theta + i \sin \theta) = re^{i\theta}
$$

### 函数定义

$$
f(x) = \begin{cases}
x^2 & \text{如果 } x \geq 0 \\
-x^2 & \text{如果 } x < 0
\end{cases}
$$

## 带中文的公式

$$
\text{如果 } x > 0 \text{，则 } f(x) = x^2
$$

$$
\text{函数 } f(x) \text{ 在点 } x_0 \text{ 处的导数为：} f'(x_0) = \lim_{h \to 0} \frac{f(x_0 + h) - f(x_0)}{h}
$$

## 混合内容测试

### 公式与文本混合

这是一个包含行内公式 $E = mc^2$ 的段落，后面跟着一个块级公式：

$$
\int_0^1 x^2 dx = \frac{1}{3}
$$

然后继续文本内容。

这里有一些文本，然后是一个数学公式 $y = mx + b$，接着是更多文本。

然后是一个块级公式：

$$
\nabla \times \vec{E} = -\frac{\partial \vec{B}}{\partial t}
$$

最后是一些普通文本。

### 列表中的公式

- 第一个公式：$a^2 + b^2 = c^2$
- 第二个公式：
  $$
  \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
  $$
- 第三个公式：$\lim_{x \to \infty} \frac{1}{x} = 0$

### 引用中的公式

> 这是一个包含公式的引用块：
>
> $$\nabla \cdot \vec{E} = \frac{\rho}{\epsilon_0}$$
>
> 这是高斯定律的微分形式。

### 表格中的公式

| 公式名称 | 公式内容           |
| -------- | ------------------ |
| 勾股定理 | $a^2 + b^2 = c^2$  |
| 欧拉公式 | $e^{i\pi} + 1 = 0$ |
| 面积公式 | $A = \pi r^2$      |

## 特殊场景测试

### 转义字符测试

$
\frac{1}{2} \quad \text{backslash}
$

### 大括号测试

$$
f(x) = \begin{cases}
x^2 & \text{如果 } x \geq 0 \\
-x^2 & \text{如果 } x < 0
\end{cases}
$$

### 上下标测试

$$
x_1^2 + x_2^2 + \cdots + x_n^2 = \sum_{i=1}^{n} x_i^2
$$

### 空格和间距测试

$$
a \, b \; c \quad d \qquad e
$$

### 特殊语法测试

#### 数组和对齐

$$
\begin{array}{c|c|c}
a & b & c \\
\hline
d & e & f \\
\hline
g & h & i
\end{array}
$$

#### 颜色测试

$$
\textcolor{red}{红色文本} \quad \textcolor{blue}{蓝色文本} \quad \textcolor{green}{绿色文本}
$$

#### 字体测试

$$
\mathbf{粗体} \quad \mathit{斜体} \quad \mathrm{正体} \quad \mathcal{花体} \quad \mathfrak{哥特体}
$$

#### 大小测试

$$
\text{巨大} \quad \text{很大} \quad \text{大} \quad \text{稍大} \quad \text{正常} \quad \text{小} \quad \text{脚注大小}
$$

#### 上标和下标嵌套

$$
x^{a_b} + x_{a^b} + x^{a^{b^c}} + x_{a_{b_c}}
$$

#### 分数嵌套

$$
\frac{\frac{a}{b}}{\frac{c}{d}} = \frac{a}{b} \times \frac{d}{c} = \frac{ad}{bc}
$$

#### 根号嵌套

$$
\sqrt{\sqrt{x} + \sqrt{\sqrt{y} + z}} = (x^{1/2} + (y^{1/2} + z)^{1/2})^{1/2}
$$

#### 括号大小自适应

$$
\left( \frac{a}{b} \right) \quad \left[ \frac{a}{b} \right] \quad \left\{ \frac{a}{b} \right\} \quad \left| \frac{a}{b} \right| \quad \left\| \frac{a}{b} \right\|
$$

#### 多行公式

$$
\begin{aligned}
f(x) &= (a+b)^2 \\
&= a^2 + 2ab + b^2 \\
&= (a+b)(a+b)
\end{aligned}
$$

#### 向量和张量

$$
\vec{v} = \begin{pmatrix} v_x \\ v_y \\ v_z \end{pmatrix} \quad \overrightarrow{AB} \quad \mathbf{T} \quad \underline{\underline{M}}
$$

#### 特殊函数

$$
\sin(x) \quad \cos(x) \quad \tan(x) \quad \log(x) \quad \ln(x) \quad \exp(x) \quad \lim_{x \to \infty} f(x)
$$

#### 省略号

$$
1 + 2 + \cdots + n = \frac{n(n+1)}{2} \quad a_1, a_2, \ldots, a_n
$$
