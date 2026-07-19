import { View, Video } from "@tarojs/components";

const happySrc = require("../../assets/happy.mp4");
const speakSrc = require("../../assets/speak.mp4");
const listenSrc = require("../../assets/listen.mp4");

interface Props {
  status: "idle" | "listening" | "speaking" | "happy" | "sad";
}

// 三视频同时后台播放，叠层 opacity 切换，无黑屏
export default function DigitalHuman({ status = "idle" }: Props) {
  var isIdle  = status === "idle"  || status === "happy" || status === "sad";
  var isListen = status === "listening";
  var isSpeak  = status === "speaking";
  return (
    <View className="dh-video-wrap">
      <Video className="dh-vid-layer" src={happySrc}  autoplay loop muted objectFit="contain" show-center-play-btn={false}
        showFullscreenBtn={false} showPlayBtn={false} showCenterPlayBtn={false}
        enableProgressGesture={false} controls={false}
        style={`position:absolute;top:0;left:0;width:100%;height:100%;opacity:${isIdle ? 1 : 0}`} />
      <Video className="dh-vid-layer" src={listenSrc} autoplay loop muted objectFit="contain"
        showFullscreenBtn={false} showPlayBtn={false} showCenterPlayBtn={false}
        enableProgressGesture={false} controls={false}
        style={`position:absolute;top:0;left:0;width:100%;height:100%;opacity:${isListen ? 1 : 0}`} />
      <Video className="dh-vid-layer" src={speakSrc}  autoplay loop muted objectFit="contain"
        showFullscreenBtn={false} showPlayBtn={false} showCenterPlayBtn={false}
        enableProgressGesture={false} controls={false}
        style={`position:absolute;top:0;left:0;width:100%;height:100%;opacity:${isSpeak ? 1 : 0}`} />
    </View>
  );
}
