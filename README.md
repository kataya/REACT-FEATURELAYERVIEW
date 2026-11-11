# REACT-FEATURELAYERVIEW

ArcGIS Maps SDK for JavaScript の公式サンプル **「Query features from a FeatureLayerView」** を、React + TypeScript で実装したプロジェクトです。

## 1. 概要

地図の表示範囲（Extent）に含まれるフィーチャを `FeatureLayerView.queryFeatures()` で検索し、その結果を Calcite Components のリストに表示します。

リストからフィーチャを選択すると、該当フィーチャの位置まで地図を移動し、Popup を表示します。

このサンプルでは、FeatureLayer 全体に対するサーバー検索ではなく、クライアント側に読み込まれているデータを対象とする `FeatureLayerView` の検索機能を使用しています。

### 参考にした公式サンプル

- [Query features from a FeatureLayerView](https://developers.arcgis.com/javascript/latest/sample-code/featurelayerview-query/)

## 2. 主な機能

- ArcGIS Maps SDK for JavaScript による地図表示
- Portal Item を使用した FeatureLayer の読み込み
- FeatureLayerView の取得
- 現在の地図表示範囲に含まれるフィーチャの検索
- 地図の移動に応じた検索結果の更新
- 検索結果の Calcite List への表示
- リスト項目の選択による地図の移動
- 選択したフィーチャの Popup 表示

## 3. 使用技術・ライブラリ

| 技術・ライブラリ | バージョン |
|---|---|
| React | 19.2.7 |
| React DOM | 19.2.7 |
| TypeScript | 6.0.2 |
| Vite | 8.0.16 |
| ArcGIS Maps SDK for JavaScript | 5.1.0 |
| ArcGIS Map Components | 5.1.0 |
| Calcite Components | 5.1.1 |

※ バージョンはプロジェクト作成時の `package.json` に基づきます。

## 4. データ

ArcGIS Online に登録されている Portal Item を使用します。

| 項目 | 内容 |
|---|---|
| Portal Item ID | `6885d0bc6bdc402683eff443e7081ef6` |
| データ | 米国の国勢調査区（Census Tract） |
| 主な属性 | 郡名、国勢調査区名、GEOID、婚姻状況に関する統計値 |

FeatureLayer の `outFields` に、検索や Popup 表示に必要な属性フィールドを指定しています。

## 5. アプリケーションの動作

### 5.1 初期化

1. `arcgis-map` コンポーネントを初期化します。
2. Basemap を設定します。
3. `arcgisViewReadyChange` イベントで Map の準備完了を検知します。
4. FeatureLayer を作成して Map に追加します。
5. `whenLayerView()` で FeatureLayerView を取得します。

### 5.2 フィーチャの検索

地図の表示範囲が変化すると、FeatureLayerView のデータ更新状態を監視します。

`dataUpdating` が `false` になったタイミングで、現在の Extent を指定して `queryFeatures()` を実行します。

```typescript
const featureSet = await layerView.queryFeatures({
  geometry: viewElement.extent,
  returnGeometry: true,
  orderByFields: ["GEOID"]
});
```

検索結果は React の State に格納し、Calcite List に反映します。

### 5.3 リスト選択

Calcite List の項目を選択すると、対応する Graphic を取得します。

その Graphic の Geometry を使って地図を移動し、重心位置に Popup を表示します。

```typescript
await viewElement.goTo(extent.expand(2));

const centroid = centroidOperator.execute(result.geometry);

viewElement.openPopup({
  features: [result],
  location: centroid
});
```

## 6. React 化に伴う実装上のポイント

元の公式サンプルは、JavaScript から DOM 要素を直接操作する構成です。

本プロジェクトでは、React のコンポーネント構造と状態管理に合わせて実装を変更しています。

### 6.1 useState と useRef の使い分け

React の状態管理には `useState` と `useRef` を使用しています。

| フック | 用途 |
|---|---|
| `useState` | 検索結果など、画面表示に反映するデータの管理 |
| `useRef` | Map コンポーネント、FeatureLayer、監視ハンドルなどの保持 |

検索結果は `useState` で管理し、更新時にリストを再描画します。

一方、ArcGIS SDK のオブジェクトや DOM 要素など、再描画を必要としない情報は `useRef` で保持します。

### 6.2 Map コンポーネントの初期化

HTML 側で Basemap を指定せず、React のコールバック Ref で設定しています。

```tsx
const setMapElement = useCallback(
  (element: HTMLArcgisMapElement | null): void => {
    if (!element) return;

    viewElementRef.current = element;
    element.basemap = "dark-gray-vector";
  },
  []
);
```

Basemap の設定後に `arcgisViewReadyChange` イベントを利用して、Map の準備完了後の処理を実行します。

### 6.3 非同期処理の管理

地図の移動に伴って複数の検索処理が実行されるため、検索結果の取得順序が逆転する可能性があります。

この問題に対応するため、`useRef` で検索処理のシーケンス番号を管理し、最新の検索結果だけを採用するようにしています。

### 6.4 イベント処理

Calcite List の選択イベントは `addEventListener()` で登録しています。

選択されたリスト項目と Map コンポーネントは別々に取得し、イベント発生元を Map コンポーネントとして扱わないようにしています。

## 7. セットアップ・起動方法

### 前提条件

- Node.js
- npm
- ArcGIS Maps SDK for JavaScript 5.x を利用できる環境

### インストール

プロジェクトのルートディレクトリで実行します。

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

起動後、ターミナルに表示される URL にブラウザからアクセスします。

通常は以下の URL です。

```text
http://localhost:5173/
```

## 8. 補足

- このプロジェクトは、ArcGIS Maps SDK for JavaScript の公式サンプルを React + TypeScript に移植した学習・検証用プロジェクトです。
- 元の公式サンプルの処理をベースに、React の状態管理やコンポーネントのライフサイクルに合わせて実装しています。
- ArcGIS Maps SDK、Map Components、Calcite Components のバージョン変更に伴い、型定義やイベントの仕様が変更される可能性があります。

## 9. 参考資料

- [ArcGIS Maps SDK for JavaScript - Query features from a FeatureLayerView](https://developers.arcgis.com/javascript/latest/sample-code/featurelayerview-query/)
- [ArcGIS Maps SDK for JavaScript - FeatureLayerView](https://developers.arcgis.com/javascript/latest/references/core/views/layers/FeatureLayerView/)
- [ArcGIS Maps SDK for JavaScript - Map Components](https://developers.arcgis.com/javascript/latest/references/map-components/)
- [Calcite Design System](https://developers.arcgis.com/calcite-design-system/)
- [React Documentation](https://react.dev/)
