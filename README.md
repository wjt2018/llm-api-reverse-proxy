# What
这是一个可以给LLM api提供反向代理服务（反正gemini是可以用的，理论上AI Studio支持的其他的模型也是可以的。）
# How
1. `npm install`安装依赖
2. `node dark-server.js`启动服务
3. 打开[Google AI Studio](https://aistudio.google.com/app/apps) -> Build -> Start from a template -> An empty app
4. 把 `dark-brows.js` 中的内容完全复制到 Google AI Studio 中，然后 `Run the App` 按钮和 `Save this App`按钮
5. 在要使用api key的地方输入`http://127.0.0.0:8889` 或者 `http://你自己的ip:8889`，然后就可以使用了。

ps: 没有代理密码，空着就行。在使用的时候请保持Google AI Studio的活跃。

致谢：https://discord.com/channels/1134557553011998840/1380129283430940712 