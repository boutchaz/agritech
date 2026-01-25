import React from "react";
import { Composition } from "remotion";
import { PromotionalVideo } from "./compositions/PromotionalVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromotionalVideo"
        component={PromotionalVideo}
        durationInFrames={1800}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{
          title: "AgriTech",
          tagline: "Pilotez Votre Exploitation Agricole",
        }}
      />
    </>
  );
};
