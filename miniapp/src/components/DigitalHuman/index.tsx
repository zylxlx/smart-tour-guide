import { View, Video } from "@tarojs/components";

const idleSrc = require("../../assets/idle.mp4");
const listenSrc = require("../../assets/listen.mp4");
const speakSrc = require("../../assets/speak.mp4");
const happySrc = require("../../assets/happy.mp4");

interface Props {
  status: "idle" | "listening" | "speaking" | "happy" | "sad";
}

const videoMap: Record<string, string> = {
  idle: idleSrc,
  listening: listenSrc,
  speaking: speakSrc,
  happy: happySrc,
  sad: idleSrc,   // 难过复用待机
};

export default function DigitalHuman({ status = "idle" }: Props) {
  const src = videoMap[status] || idleSrc;
  return (
    <View className="dh-body">
      <Video
        className="dh-video"
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
