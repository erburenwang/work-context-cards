# Work Context Cards

**A small, private handoff card for work you will return to.** Keep the verified state, evidence, one next step, and boundaries in one place. Copy a clear handoff into any AI chat or share it with a teammate.

[Open the live demo](https://erburenwang.github.io/work-context-cards/) · [简体中文](#简体中文)

![MIT license](https://img.shields.io/badge/license-MIT-green.svg) ![No runtime dependencies](https://img.shields.io/badge/runtime-dependencies-none-176b57.svg)

## Why this exists

Long-running work gets scattered across chats, notes, branches, and browser tabs. Work Context Cards keeps only the details needed to resume safely:

- The goal and what “done” means
- The latest state you actually verified
- Evidence or source locations
- One concrete next step
- Boundaries and stop conditions

The generated Markdown asks the next person or assistant to re-check evidence, separate facts from assumptions, respect the stated boundaries, and report what remains open. It does not import chat histories, guess progress, or execute tasks.

## Use it

1. Open the [live demo](https://erburenwang.github.io/work-context-cards/), or download this repository and open `index.html`.
2. Create a card and record the project name, goal, verified state, and next step. Other fields are optional.
3. Choose **Make handoff** to review the generated Markdown, then copy it or download it as a `.md` file.
4. Export a JSON backup before changing browsers or clearing browser data. Importing a backup replaces the current cards only after confirmation.

The interface follows the browser language when first opened and supports English and Simplified Chinese. Use the language button to switch at any time.

### Run locally

No package installation is needed to run the app. From the repository folder, you can use any static file server; for example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. Direct `file://` use also works in many browsers, but browser storage rules for local files vary; the app reports when it cannot save.

## Privacy and data

- Card data stays in this browser's `localStorage`. The app code does not send card contents to a server.
- The GitHub Pages demo downloads static HTML, CSS, and JavaScript from GitHub. After load, the app code makes no network requests and does not send card contents anywhere; it has no analytics, third-party scripts, or account system.
- The app never scans local files. It reads a JSON backup only after you choose that file in the import dialog.
- Browser storage and exported JSON files are not encrypted by this app. Do not store passwords, access tokens, cookies, private keys, or other secrets in cards or backups.
- Keep the JSON backup somewhere safe. Clearing site data or using another browser can remove or hide cards from this browser.

## Limits

- Up to 500 cards; imported JSON backups are limited to 5 MB.
- No cloud sync, shared workspace, merge, AI provider integration, or chat-history import.
- Handoffs reflect the most recent card edit. The person resuming work still needs to verify that the evidence is current.

## Development

Requires Node.js 22 or newer for the built-in test runner. There are no runtime or development dependencies.

```sh
npm run check
npm test
```

Pull requests run the same checks. Changes pushed to `main` deploy the static app to GitHub Pages.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance. The project is released under the [MIT License](LICENSE).

---

## 简体中文

**一张小卡片，留下下次接手工作真正需要的内容。** 记录已经核实的状态、证据、唯一下一步和边界。复制生成的交接说明到任意 AI 对话，也可以发给同事。

### 为什么做它

长期项目的现场容易散在聊天、笔记、代码分支和浏览器标签里。工作续接卡只保留重新开工需要的内容：

- 目标与完成标准
- 最近一次亲自核实的状态
- 证据或来源位置
- 一个明确的下一步
- 边界与停止条件

生成的 Markdown 会提醒接手的人重新核对证据、区分事实与推测、遵守边界，并报告仍未解决的事项。它不会导入聊天记录、猜测进度或自动执行任务。

### 使用方法

1. 打开[在线演示](https://erburenwang.github.io/work-context-cards/)，或下载仓库后打开 `index.html`。
2. 新建卡片，填写项目名称、目标、已核实状态和下一步；其他栏目可留空。
3. 点击**生成交接说明**，检查 Markdown 后复制或下载 `.md` 文件。
4. 换浏览器或清理浏览器数据前先导出 JSON 备份。导入备份会先确认，再替换当前卡片。

初次打开时，界面会跟随浏览器语言，也可随时用语言按钮切换中英文。

### 本地运行

运行应用不需要安装任何包。在仓库目录中，可使用任意静态文件服务器，例如：

```sh
python -m http.server 8000
```

然后打开 `http://localhost:8000`。很多浏览器也支持直接打开 `file://` 文件，但本地文件的浏览器存储规则不同；如果无法保存，页面会显示提示。

### 隐私与数据

- 卡片保存在当前浏览器的 `localStorage` 中；应用代码不会把卡片内容发送到服务器。
- GitHub Pages 演示会从 GitHub 加载静态 HTML、CSS 和 JavaScript。页面加载后，应用代码不会发起网络请求，也不会发送卡片内容；应用没有分析脚本、第三方脚本或账号系统。
- 应用不会扫描本机文件。只有在导入时主动选择 JSON 备份，页面才会读取该文件。
- 应用不会加密浏览器存储或导出的 JSON。请勿在卡片或备份中存放密码、令牌、Cookie、私钥等秘密。
- 请妥善保管 JSON 备份。清理站点数据或换浏览器后，当前浏览器中的卡片可能被删除或无法访问。

### 当前限制

- 最多保存 500 张卡；导入 JSON 备份最大为 5 MB。
- 暂不支持云同步、共享工作区、合并、AI 服务集成或聊天记录导入。
- 交接说明反映卡片最近一次更新；重新开工的人仍需确认现场和证据是否最新。

