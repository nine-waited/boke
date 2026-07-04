/** @type {import('@chestnut/plugin-sdk').PluginExports} */
export const onLoad = (api) => {
  const dispose = api.commands.register({
    id: "hello-world:greet",
    name: "Say hello from plugin",
    category: "Hello World",
    callback: () => {
      api.log("Hello command executed");
      const item = api.statusBar.add({ text: "Hello!" });
      setTimeout(() => item.remove(), 3000);
    },
  });

  api.statusBar.add({
    text: "Hello plugin",
    tooltip: "Hello World plugin is active",
  });

  return dispose;
};

export const onUnload = (api) => {
  api.log("Goodbye");
};
