
export enum Position {
  LEFT = '左',
  CENTER = '中央',
  RIGHT = '右',
  NONE = 'なし'
}

export interface CharacterConfig {
  name: string;
  position: Position;
}

export interface ScriptRow {
  id: string;
  character: string;
  dialogue: string;
  command: string; // "場面切り替え", "画面表示", "全部消して", or custom notes
}

export interface ProcessedRow {
  originalIndex: number;
  layerName: string;
  dialogue: string;
  command: string;
}

export interface SceneConfig {
  left: string;
  center: string;
  right: string;
}
