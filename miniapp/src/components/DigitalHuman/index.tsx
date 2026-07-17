import { View } from "@tarojs/components";

interface Props {
  status: "idle" | "listening" | "speaking" | "happy";
}

export default function DigitalHuman({ status = "idle" }: Props) {
  return (
    <View className={`dh-body dh-${status}`}>
      {/* 头 */}
      <View className="dh-head">
        <View className="dh-face">
          <View className="dh-eye left" />
          <View className="dh-eye right" />
          <View className="dh-mouth" />
        </View>
      </View>
      {/* 身体 — 袈裟 */}
      <View className="dh-robe">
        <View className="dh-collar" />
        <View className="dh-collar right" />
      </View>
    </View>
  );
}
