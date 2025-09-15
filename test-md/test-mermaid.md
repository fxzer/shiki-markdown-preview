# 图表与流程图测试 (Mermaid)

## 流程图 (Flowchart)

```mermaid
graph TD
    A[开始] --> B{条件};
    B -->|是| C[操作A];
    B -->|否| D[操作B];
    C --> E[结束];
    D --> E;
```

## 时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User
    participant Server
    User->>Server: 请求
    Server-->>User: 响应
```

## 甘特图 (Gantt Chart)

```mermaid
gantt
    title 项目计划
    dateFormat YYYY-MM-DD
    section 核心开发
    任务: 2024-01-01, 7d
```

## 饼图 (Pie Chart)

```mermaid
pie
    title 市场份额
    "A" : 45
    "B" : 25
    "C" : 30
```

## 类图 (Class Diagram)

```mermaid
classDiagram
    class Animal {
      +makeSound()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog
```

## 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中
    处理中 --> [*]
```

## 实体关系图 (ER Diagram)

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
    }
    ORDER {
        int orderID
    }
```

## Git 图 (Git Graph)

```mermaid
gitGraph
    commit
    branch develop
    checkout develop
    commit
    checkout main
    merge develop
```

## 思维导图 (Mindmap)

```mermaid
mindmap
  root((核心))
    分支1
    分支2
```

## 流程图 - 子图 (Subgraph)

```mermaid
graph TB
    subgraph 前端
        A[HTML] --> B[CSS]
        B --> C[JavaScript]
    end
    subgraph 后端
        D[Node.js] --> E[Express]
        E --> F[数据库]
    end
    C --> D
```

## 时序图 - 循环和条件

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Database

    loop 每日检查
        Client->>Server: 请求数据
        alt 数据存在
            Server->>Database: 查询数据
            Database-->>Server: 返回数据
            Server-->>Client: 返回结果
        else 数据不存在
            Server-->>Client: 返回空结果
        end
    end
```

## 甘特图 - 复杂项目

```mermaid
gantt
    title 软件开发项目时间线
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求收集           :a1, 2024-01-01, 5d
    需求整理           :a2, after a1, 3d
    需求评审           :a3, after a2, 1d
    section 设计阶段
    UI设计            :b1, after a3, 7d
    数据库设计         :b2, after a3, 4d
    架构设计           :b3, after a3, 5d
    section 开发阶段
    前端开发          :c1, after b1, 14d
    后端开发          :c2, after b2, 14d
    接口联调          :c3, after c1, 5d
    section 测试阶段
    单元测试          :d1, after c2, 5d
    集成测试          :d2, after d1, 7d
    用户验收测试       :d3, after d2, 5d
```

## 旅程图 (Journey)

```mermaid
journey
    title 用户购物体验
    section 浏览
      访问网站: 5: 用户
      搜索商品: 4: 用户
      查看详情: 3: 用户
    section 购买
      添加购物车: 5: 用户
      结账: 4: 用户
      支付: 3: 用户
    section 收货
      等待配送: 2: 用户
      收到商品: 5: 用户
      评价: 3: 用户
```

## 时间线图 (Timeline)

```mermaid
timeline
    title 项目发展历史
    section 2024年
      第一季度 : 项目启动
      第二季度 : 需求分析
      第三季度 : 开发阶段
      第四季度 : 测试上线
    section 2025年
      第一季度 : 版本迭代
      第二季度 : 功能扩展
```

## C4 图表 (C4 Diagram)

```mermaid
C4Context
    title 系统上下文图

    Person(用户, "系统用户", "使用系统的人员")
    System(系统, "示例系统", "处理业务逻辑的核心系统")
    System_Ext(外部系统, "外部API", "提供数据的外部服务")

    Rel(用户, 系统, "使用")
    Rel(系统, 外部系统, "调用API")
```

## 流程图 - 不同方向和样式

```mermaid
graph LR
    A[开始] --> B{判断};
    B -->|条件1| C[处理1];
    B -->|条件2| D[处理2];
    C --> E[结束];
    D --> E;

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
```
