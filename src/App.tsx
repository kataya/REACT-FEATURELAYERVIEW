import { useCallback, useEffect, useRef, useState } from "react";

import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-popup";

import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-block";
import "@esri/calcite-components/components/calcite-list";
import "@esri/calcite-components/components/calcite-list-item";

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import * as centroidOperator from "@arcgis/core/geometry/operators/centroidOperator";

import "./App.css";

const PORTAL_ITEM_ID = "6885d0bc6bdc402683eff443e7081ef6";

const OUT_FIELDS = [
    "County",
    "NAME",
    "GEOID",
    "B12001_calc_pctDivorcedE",
    "B12001_calc_pctMarriedE",
    "B12001_calc_pctNeverE",
    "B12001_calc_numDivorcedE",
    "B12001_calc_numMarriedE",
    "B12001_calc_numNeverE"
];


export function App(): React.JSX.Element {
    const [features, setFeatures] = useState<Graphic[]>([]);

    // ArcGIS component / query の参照
    const viewElementRef = useRef<HTMLArcgisMapElement | null>(null);
    const graphicsRef = useRef<Graphic[]>([]);
    const featureLayerRef = useRef<FeatureLayer | null>(null);

    // reactiveUtils の監視解除用
    const layerViewHandleRef = useRef<{ remove: () => void } | null>(null);

    // 非同期検索の結果が逆転することを防ぐ
    const querySequenceRef = useRef(0);

    // Calcite List
    const resultsListRef = useRef<HTMLCalciteListElement | null>(null);

    //
    // Basemap の初期設定
    //
    const setMapElement = useCallback(
        (element: HTMLArcgisMapElement | null): void => {
            if (!element) return;

            viewElementRef.current = element;

            element.basemap = "dark-gray-vector";
        },
        []
    );

    //
    // リスト選択イベント
    //
    const onListClickHandler = useCallback(
        async (event: Event): Promise<void> => {
            // 選択された calcite-list-item
            const selectedItem = event.target as HTMLCalciteListItemElement;

            const resultId = String(selectedItem.value);
            const index = Number.parseInt(resultId, 10);
            if (!Number.isInteger(index)) return;

            const result = graphicsRef.current[index];
            if (!result?.geometry) return;

            // arcgis-map コンポーネントを取得
            const viewElement = viewElementRef.current;
            if (!viewElement) return;

            try {
            const extent = result.geometry.extent;
            if (!extent) return;

            await viewElement.goTo(extent.expand(2));

            const centroid = centroidOperator.execute(result.geometry);
            if (!centroid) return;

            viewElement.openPopup({
                features: [result],
                location: centroid
            });

            } catch (error) {
            if (!(error instanceof Error) || error.name !== "AbortError") {
                console.error(error);
            }
            }
        },
        []
    );

    //
    // リストイベント登録
    //
    useEffect(() => {
        const resultsList = resultsListRef.current;
        if (!resultsList) return;

        resultsList.addEventListener("calciteListItemSelect", onListClickHandler);

        return () => {
            resultsList.removeEventListener("calciteListItemSelect", onListClickHandler);
        };
    }, [onListClickHandler]);

    //
    // View の準備完了
    //
    // 以下のヘルプに記載されているように
    // arcgis-map component に basemap が設定されていない場合、arcgisViewReadyChange イベントは発火しない
    // https://developers.arcgis.com/javascript/latest/watch-for-changes/?utm_source=chatgpt.com
    // 
    const handleViewReady = async (event: CustomEvent): Promise<void> => {
        console.log("handleViewReady fired");

        const viewElement = event.target as HTMLArcgisMapElement;
        const map = viewElement.map;
        if (!map) return;

        viewElementRef.current = viewElement;
        if (featureLayerRef.current) return;

        viewElement.constraints.minScale = 577790.5542885;

        const featureLayer = new FeatureLayer({
            portalItem: {
            id: PORTAL_ITEM_ID,
            },
            outFields: OUT_FIELDS,
        });

        featureLayerRef.current = featureLayer;

        map.add(featureLayer);

        // FeatureLayerView を取得
        const layerView = await viewElement.whenLayerView(featureLayer);
        layerViewHandleRef.current?.remove();

        layerViewHandleRef.current = reactiveUtils.when(
            () => !layerView.dataUpdating,
            async () => {
            try {
                const extent = viewElement.extent;
                if (!extent) return;

                const sequence = ++querySequenceRef.current;

                const featureSet = await layerView.queryFeatures({
                geometry: extent,
                returnGeometry: true,
                orderByFields: ["GEOID"]
                });

                if (sequence !== querySequenceRef.current) return;

                graphicsRef.current = featureSet.features;
                setFeatures(featureSet.features);

            } catch (error) {
                console.error("Query failed:", error);
            }
            },
            { initial: true }
        );
    };

    //
    // 後始末
    //
    useEffect(() => {
        return () => {
            layerViewHandleRef.current?.remove();
            layerViewHandleRef.current = null;
            querySequenceRef.current++;
        };
    }, []);


    return (
    <calcite-shell>
        <arcgis-map
            ref={setMapElement}
            center="-73.95, 40.702"
            zoom={12}
            onarcgisViewReadyChange={handleViewReady}
            className="map-container"
        >
            <arcgis-zoom slot="top-left" />
            <arcgis-popup slot="popup" />
        </arcgis-map>

        <calcite-block
            expanded
            slot="panel-end"
            heading="Marriage by Census Tract"
            className="tracts-block"
        >
            <calcite-list
                ref={resultsListRef}
                label="Marriage by Census Tract"
            >
                {features.map((feature, index) => (
                    <calcite-list-item
                        key={String(feature.attributes.GEOID ?? index)}
                        label={String(feature.attributes.NAME ?? "")}
                        value={String(index)}
                    />
                ))}
            </calcite-list>
        </calcite-block>
    </calcite-shell>
    );
}
