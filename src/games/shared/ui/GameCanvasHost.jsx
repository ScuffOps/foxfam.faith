import { useEffect, useRef } from "react";
import { createGameInstance } from "@/games/shared/phaser/createGameInstance";

export default function GameCanvasHost({ scene, bridge, className = "", backgroundColor }) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || !scene) return undefined;

    const SceneClass = scene;
    const BoundScene = class extends SceneClass {
      constructor() {
        super({ bridge });
      }
    };

    gameRef.current = createGameInstance({
      parent: hostRef.current,
      scene: BoundScene,
      backgroundColor,
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [backgroundColor, bridge, scene]);

  return (
    <div
      ref={hostRef}
      className={`relative min-h-[22rem] overflow-hidden rounded-xl border border-white/10 bg-black/30 ${className}`}
    />
  );
}
