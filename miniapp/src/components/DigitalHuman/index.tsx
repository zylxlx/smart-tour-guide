import { View, Video } from "@tarojs/components";

const happySrc = require("../../assets/happy.mp4");
const speakSrc = require("../../assets/speak.mp4");
const listenSrc = require("../../assets/listen.mp4");

interface Props {
  status: "idle" | "listening" | "speaking" | "happy" | "sad";
}

// 严格对应：待机→微笑 说话→speak 倾听→listen
const videoMap: Record<string, string> = {
  idle: happySrc,
  listening: listenSrc,
  speaking: speakSrc,
  happy: happySrc,
  sad: happySrc,
};

export default function DigitalHuman({ status = "idle" }: Props) {
  var src = videoMap[status] || happySrc;
  return (
    <View className="dh-video-wrap" key={status}>
      <Video
        key={status}
        className="dh-vid"
        src={src}
        autoplay
        loop
        muted
        objectFit="contain"
        showFullscreenBtn={false}
        showPlayBtn={false}
        showCenterPlayBtn={false}
        enableProgressGesture={false}
        controls={false}
      />
    </View>
  );
}
