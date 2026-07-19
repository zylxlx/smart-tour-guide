import { View, Video } from "@tarojs/components";

const happySrc = require("../../assets/dh-happy.mp4");
const speakSrc = require("../../assets/dh-speak.mp4");
const listenSrc = require("../../assets/dh-listen.mp4");

interface Props {
  status: "idle" | "listening" | "speaking" | "happy" | "sad";
}

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
    <View className="dh-video-wrap">
      <Video
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
