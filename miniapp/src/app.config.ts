export default defineAppConfig({
  pages: ["pages/index/index", "pages/admin/index"],
  permission: {
    "scope.record": {
      desc: "需要使用您的麦克风进行语音识别",
    },
  },
  window: {
    navigationStyle: "custom",
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#b8860b",
    navigationBarTitleText: "灵山AI禅意导游",
    navigationBarTextStyle: "white",
  },
});
