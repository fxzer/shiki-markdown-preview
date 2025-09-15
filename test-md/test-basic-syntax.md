# 基础语法测试d dsfdsf

## 标题abdsfsdfsdfsdfdsfdddabcabc

# H1234fsdfdsasfd

## H2dfds dsfdssdfdsfsfsadfds

### H3dddda

fsdfsadfdsfa 发的撒发 ffsdafsafsdfasdf ddddasdfaddfdsf

## 文本格式

`abc`
**粗体**、_斜体_、**_粗斜体_**、~~删除线~~
**abc** <br>
`行内代码` 和 \*转义字符\*。 dsafdsfdsfdsfdsfdsfdfds23432
adfdsafdfdfdsfdf

## 列表

asdfdsfdsfdsfdsf

### 无序列表

- 列表项 1
- 列表项 2
  - 嵌套项 2.1
    - 更深层嵌套
- 列表项 3

### 有序列表

1. 列表项 1
2. 列表项 2
   1. 嵌套项 2.1
3. 列表项 3

### 任务列表

- [x] 已完成
- [ ] 未完成
  - [x] 已完成的子任务

## 分割线

---

## 代码块测试

### JavaScript 长代码块

```javascript
// 这是一个很长的 JavaScript 代码块，用来测试水平滚动条
function processLargeDataStructure(data) {
  const result = {
    processedItems: [],
    statistics: {
      totalCount: 0,
      successCount: 0,
      errorCount: 0,
      averageProcessingTime: 0
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  }

  // 处理每个数据项
  data.forEach((item, index) => {
    try {
      const processedItem = {
        id: item.id || `item_${index}`,
        name: item.name || 'Unknown',
        value: item.value || 0,
        processedAt: new Date().toISOString(),
        isValid: validateItem(item),
        computedValue: computeValue(item.value, item.multiplier || 1)
      }

      result.processedItems.push(processedItem)
      result.statistics.successCount++
    }
    catch (error) {
      console.error(`Error processing item ${index}:`, error)
      result.statistics.errorCount++
    }

    result.statistics.totalCount++
  })

  // 计算平均处理时间
  if (result.statistics.totalCount > 0) {
    result.statistics.averageProcessingTime
      = result.statistics.totalCount / (Date.now() - startTime)
  }

  return result
}

function validateItem(item) {
  return item
    && typeof item === 'object'
    && item.id !== undefined
    && item.name !== undefined
}

function computeValue(baseValue, multiplier) {
  return baseValue * multiplier * Math.random() * 100
}
```

### Python 长代码块

```python
# 这是一个很长的 Python 代码块，用来测试水平滚动条
import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class DataProcessor:
    """数据处理器类，用于处理各种类型的数据"""

    input_path: str
    output_path: str
    config: Dict[str, Any]
    logger: logging.Logger

    def __post_init__(self):
        """初始化后处理"""
        self.setup_logging()
        self.validate_paths()
        self.load_configuration()

    def setup_logging(self) -> None:
        """设置日志记录"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('data_processor.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)

    def validate_paths(self) -> None:
        """验证输入和输出路径"""
        if not os.path.exists(self.input_path):
            raise FileNotFoundError(f"Input path does not exist: {self.input_path}")

        output_dir = os.path.dirname(self.output_path)
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            self.logger.info(f"Created output directory: {output_dir}")

    def load_configuration(self) -> None:
        """加载配置文件"""
        config_file = self.config.get('config_file')
        if config_file and os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                additional_config = json.load(f)
                self.config.update(additional_config)
                self.logger.info(f"Loaded configuration from: {config_file}")

    def process_data(self) -> Dict[str, Any]:
        """处理数据的主要方法"""
        start_time = datetime.now()
        self.logger.info("Starting data processing...")

        try:
            # 读取输入数据
            input_data = self.read_input_data()

            # 处理数据
            processed_data = self.transform_data(input_data)

            # 保存结果
            self.save_output_data(processed_data)

            # 计算处理时间
            processing_time = datetime.now() - start_time

            result = {
                'status': 'success',
                'processing_time': str(processing_time),
                'records_processed': len(processed_data),
                'output_file': self.output_path
            }

            self.logger.info(f"Data processing completed successfully in {processing_time}")
            return result

        except Exception as e:
            self.logger.error(f"Error during data processing: {str(e)}")
            return {
                'status': 'error',
                'error_message': str(e),
                'processing_time': str(datetime.now() - start_time)
            }

    def read_input_data(self) -> List[Dict[str, Any]]:
        """读取输入数据"""
        self.logger.info(f"Reading data from: {self.input_path}")

        with open(self.input_path, 'r', encoding='utf-8') as f:
            if self.input_path.endswith('.json'):
                return json.load(f)
            else:
                # 假设是 CSV 或其他格式
                return self.parse_csv_data(f.read())

    def transform_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """转换数据"""
        self.logger.info(f"Transforming {len(data)} records...")

        transformed_data = []
        for record in data:
            try:
                transformed_record = self.transform_record(record)
                transformed_data.append(transformed_record)
            except Exception as e:
                self.logger.warning(f"Failed to transform record: {e}")
                continue

        return transformed_data

    def transform_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """转换单个记录"""
        # 这里可以添加具体的数据转换逻辑
        transformed = record.copy()
        transformed['processed_at'] = datetime.now().isoformat()
        transformed['record_id'] = f"rec_{hash(str(record))}"
        return transformed

    def save_output_data(self, data: List[Dict[str, Any]]) -> None:
        """保存输出数据"""
        self.logger.info(f"Saving {len(data)} records to: {self.output_path}")

        with open(self.output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def parse_csv_data(self, csv_content: str) -> List[Dict[str, Any]]:
        """解析 CSV 数据（简化版本）"""
        lines = csv_content.strip().split('\n')
        if not lines:
            return []

        headers = lines[0].split(',')
        data = []

        for line in lines[1:]:
            values = line.split(',')
            if len(values) == len(headers):
                record = dict(zip(headers, values))
                data.append(record)

        return data

# 使用示例
if __name__ == "__main__":
    config = {
        'config_file': 'config.json',
        'batch_size': 1000,
        'enable_validation': True
    }

    processor = DataProcessor(
        input_path='input_data.json',
        output_path='output/processed_data.json',
        config=config,
        logger=None  # 将在 __post_init__ 中设置
    )

    result = processor.process_data()
    print(f"Processing result: {result}")
```

## 注释

<!-- 这是一个 HTML 注释 -->
