import React from "react";
import { Composition, registerRoot } from "remotion";
import { ClockScene } from "./ClockScene";
import { demoResult } from "./domain";

const Studio = () => (
  <>
    <Composition
      id="Aether-Ordinary"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={210}
      defaultProps={{
        phase: "reveal",
        result: demoResult("rare"),
        reducedMotion: false,
        progress: 0,
        includeAudio: true,
      }}
    />
    <Composition
      id="Aether-Four-Star"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={240}
      defaultProps={{
        phase: "reveal",
        result: demoResult("epic"),
        reducedMotion: false,
        progress: 0,
        includeAudio: true,
      }}
    />
    <Composition
      id="Aether-Five-Star"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={270}
      defaultProps={{
        phase: "reveal",
        result: demoResult("mythic"),
        reducedMotion: false,
        progress: 0,
        includeAudio: true,
      }}
    />
    <Composition
      id="Aether-Overlay-Ordinary"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={210}
      defaultProps={{
        phase: "reveal",
        result: demoResult("rare"),
        reducedMotion: false,
        progress: 0,
        transparent: true,
        includeAudio: true,
        showReward: false,
      }}
    />
    <Composition
      id="Aether-Overlay-Four-Star"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={240}
      defaultProps={{
        phase: "reveal",
        result: demoResult("epic"),
        reducedMotion: false,
        progress: 0,
        transparent: true,
        includeAudio: true,
        showReward: false,
      }}
    />
    <Composition
      id="Aether-Overlay-Five-Star"
      component={ClockScene}
      width={1500}
      height={1050}
      fps={30}
      durationInFrames={270}
      defaultProps={{
        phase: "reveal",
        result: demoResult("mythic"),
        reducedMotion: false,
        progress: 0,
        transparent: true,
        includeAudio: true,
        showReward: false,
      }}
    />
  </>
);
registerRoot(Studio);
