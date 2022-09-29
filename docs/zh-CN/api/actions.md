# 内置常用资源操作

针对常用的 CRUD 等数据资源的操作，NocoBase 内置了对应操作方法，并通过数据表资源自动映射相关的操作。

所有的操作方法都是注册在 resourcer 实例上，也是标准兼容 Koa 的中间件函数（`(ctx, next) => Promise<void>`）。操作的参数由路由解析后附加在 `ctx.action` 对象上，后续参数相关介绍均基于此对象。

通常情况下无需直接调用内置的 action 方法，在需要扩展默认操作行为时，可以在自定义的操作方法内调用默认方法。

## 包结构

可通过以下方式引入相关实体：

```ts
import actions from '@nocobase/actions';
```

## 单一数据资源操作

### `list()`

获取数据列表。对应资源操作的 URL 为 `GET /api/<resource>:list`。

**参数**

| 参数名 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `filter` | `Filter` | - | 过滤参数 |
| `fields` | `string[]` | - | 要获取的字段 |
| `except` | `string[]` | - | 要排除的字段 |
| `appends` | `string[]` | - | 要附加的关系字段 |
| `sort` | `string[]` | - | 排序参数 |
| `page` | `number` | 1 | 分页 |
| `pageSize` | `number` | 20 | 每页数据条数 |

**示例**

当需要提供一个查询数据列表的接口，但不是默认以 JSON 格式输出时，可以基于内置默认方法进行扩展：

```ts
import actions from '@nocobase/actions';

app.actions({
  async ['books:list'](ctx, next) {
    ctx.action.mergeParams({
      except: ['content']
    });

    await actions.list(ctx, async () => {
      const { rows } = ctx.body;
      // transform JSON to CSV output
      ctx.body = rows.map(row => Object.keys(row).map(key => row[key]).join(',')).join('\n');
      ctx.type = 'text/csv';

      await next();
    });
  }
});
```

请求示例，将获得 CSV 格式文件的返回：

```shell
curl -X GET http://localhost:13000/api/books:list
```

### `get()`

获取单条数据。对应资源操作的 URL 为 `GET /api/<resource>:get`。

**参数**

| 参数名 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `filterByTk` | `number \| string` | - | 过滤主键 |
| `filter` | `Filter` | - | 过滤参数 |
| `fields` | `string[]` | - | 要获取的字段 |
| `except` | `string[]` | - | 要排除的字段 |
| `appends` | `string[]` | - | 要附加的关系字段 |
| `sort` | `string[]` | - | 排序参数 |
| `page` | `number` | 1 | 分页 |
| `pageSize` | `number` | 20 | 每页数据条数 |

**示例**

基于 NocoBase 内置的文件管理插件，可以扩展当客户端请求以资源标识下载一个文件时，返回文件流：

```ts
import path from 'path';
import actions from '@nocobase/actions';
import { STORAGE_TYPE_LOCAL } from '@nocobase/plugin-file-manager';

app.actions({
  async ['attachments:get'](ctx, next) {
    ctx.action.mergeParams({
      appends: ['storage'],
    });

    await actions.get(ctx, async () => {
      if (ctx.accepts('json', 'application/octet-stream') === 'json') {
        return next();
      }

      const { body: attachment } = ctx;
      const { storage } = attachment;

      if (storage.type !== STORAGE_TYPE_LOCAL) {
        return ctx.redirect(attachment.url);
      }

      ctx.body = fs.createReadStream(path.resolve(storage.options.documentRoot?, storage.path));
      ctx.attachment(attachment.filename);
      ctx.type = 'application/octet-stream';

      await next();
    });
  }
});
```

请求示例，将获得文件流的返回：

```shell
curl -X GET -H "Accept: application/octet-stream" http://localhost:13000/api/attachments:get?filterByTk=1
```

### `create()`

创建单条数据。对应资源操作的 URL 为 `POST /api/<resource>:create`。

**参数**

| 参数名 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `values` | `Object` | - | 要创建的数据 |

**示例**

类似文件管理插件，创建带有二进制内容的数据作为上传文件的附件：

```ts
import multer from '@koa/multer';
import actions from '@nocobase/actions';

app.actions({
  async ['files:create'](ctx, next) {
    if (ctx.request.type === 'application/json') {
      return actions.create(ctx, next);
    }

    if (ctx.request.type !== 'multipart/form-data') {
      return ctx.throw(406);
    }

    // 文件保存处理仅用 multer() 作为示例，不代表完整的逻辑
    multer().single('file')(ctx, async () => {
      const { file, body } = ctx.request;
      const { filename, mimetype, size, path } = file;

      ctx.action.mergeParams({
        values: {
          filename,
          mimetype,
          size,
          path: file.path,
          meta: typeof body.meta === 'string' ? JSON.parse(body.meta) : {};
        }
      });

      await actions.create(ctx, next);
    });
  }
});
```

请求示例，可以创建文件表的普通数据，也可以含附件一起提交：

```shell
# 仅创建普通数据
curl -X POST -H "Content-Type: application/json" -d '{"filename": "some-file.txt", "mimetype": "text/plain", "size": 5, "url": "https://cdn.yourdomain.com/some-file.txt"}' "http://localhost:13000/api/files:create"

# 含附件一起提交
curl -X POST -F "file=@/path/to/some-file.txt" -F 'meta={"length": 100}' "http://localhost:13000/api/files:create"
```

### `update()`

更新一条或多条数据。对应的 URL 为 `DELETE /api/<resource>:delete`。

**参数**

| 参数名 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `filter` | `Filter` | - | 过滤参数 |
| `filterByTk` | `number \| string` | - | 过滤主键 |
| `values` | `Object` | - | 更新数据值 |

注：参数中的 `filter` 和 `filterByTk` 至少提供一项。

**示例**

类似 `create()` 的例子，更新文件记录可以扩展为可携带二进制内容的数据作为更新的文件：

```ts
import multer from '@koa/multer';
import actions from '@nocobase/actions';

app.actions({
  async ['files:update'](ctx, next) {
    if (ctx.request.type === 'application/json') {
      return actions.update(ctx, next);
    }

    if (ctx.request.type !== 'multipart/form-data') {
      return ctx.throw(406);
    }

    // 文件保存处理仅用 multer() 作为示例，不代表完整的逻辑
    multer().single('file')(ctx, async () => {
      const { file, body } = ctx.request;
      const { filename, mimetype, size, path } = file;

      ctx.action.mergeParams({
        values: {
          filename,
          mimetype,
          size,
          path: file.path,
          meta: typeof body.meta === 'string' ? JSON.parse(body.meta) : {};
        }
      });

      await actions.update(ctx, next);
    });
  }
});
```

请求示例，可以创建文件表的普通数据，也可以含附件一起提交：

```shell
# 仅创建普通数据
curl -X PUT -H "Content-Type: application/json" -d '{"filename": "some-file.txt", "mimetype": "text/plain", "size": 5, "url": "https://cdn.yourdomain.com/some-file.txt"}' "http://localhost:13000/api/files:update"

# 含附件一起提交
curl -X PUT -F "file=@/path/to/some-file.txt" -F 'meta={"length": 100}' "http://localhost:13000/api/files:update"
```

### `destroy()`

删除一条或多条数据。对应的 URL 为 `DELETE /api/<resource>:destroy`。

**参数**

| 参数名 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `filter` | `Filter` | - | 过滤参数 |
| `filterByTk` | `number \| string` | - | 过滤主键 |

注：参数中的 `filter` 和 `filterByTk` 至少提供一项。

**示例**

类似对文件管理插件扩展一个删除文件数据也需要同时删除对应文件的操作处理：

```ts
import actions from '@nocobase/actions';

app.actions({
  async ['files:destroy'](ctx, next) {
    // const repository = getRepositoryFromParams(ctx);

    // const { filterByTk, filter } = ctx.action.params;

    // const items = await repository.find({
    //   fields: [repository.collection.filterTargetKey],
    //   appends: ['storage'],
    //   filter,
    //   filterByTk,
    //   context: ctx,
    // });

    // await items.reduce((promise, item) => promise.then(async () => {
    //   await item.removeFromStorage();
    //   await item.destroy();
    // }), Promise.resolve());

    await actions.destroy(ctx, async () => {
      // do something
      await next();
    });
  }
});
```

## 关系资源资源操作

TODO