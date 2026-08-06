import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"


def run():
    import train_lstm
    import train_random_forest
    import train_xgboost

    rf_metrics, feature_columns = train_random_forest.train()
    print(f"random_forest: RMSE={rf_metrics['rmse']:.3f}  MAE={rf_metrics['mae']:.3f}  R2={rf_metrics['r2']:.3f}  size={rf_metrics['size_mb']:.2f}MB")

    xgb_metrics, _ = train_xgboost.train()
    print(f"xgboost:       RMSE={xgb_metrics['rmse']:.3f}  MAE={xgb_metrics['mae']:.3f}  R2={xgb_metrics['r2']:.3f}  size={xgb_metrics['size_mb']:.2f}MB")

    lstm_metrics, _ = train_lstm.train()
    print(f"lstm:          RMSE={lstm_metrics['rmse']:.3f}  MAE={lstm_metrics['mae']:.3f}  R2={lstm_metrics['r2']:.3f}  size={lstm_metrics['size_mb']:.2f}MB")

    all_metrics = [rf_metrics, xgb_metrics, lstm_metrics]
    best = min(all_metrics, key=lambda m: m["rmse"])

    total_size = sum(m["size_mb"] for m in all_metrics)

    from features import SEQUENCE_LENGTH, build_datasets, build_sequences

    _, val_df, _, categories = build_datasets()

    sample_group = val_df["group_id"].iloc[0]
    sample_rows = val_df[val_df["group_id"] == sample_group].sort_values("date")
    sequence_window = sample_rows.iloc[-(SEQUENCE_LENGTH + 1) : -1]
    target_row = sample_rows.iloc[-1]

    sample_input = {
        "site_id": sample_group,
        "date": str(target_row["date"].date()),
        "tabular_features": target_row[feature_columns].astype(float).to_dict(),
        "sequence_features": sequence_window[feature_columns].astype(float).to_numpy().tolist(),
        "actual_vwc": float(target_row["vwc"]),
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    (MODELS_DIR / "feature_columns.json").write_text(json.dumps(feature_columns, indent=2))
    (MODELS_DIR / "categories.json").write_text(json.dumps(categories, indent=2))
    (MODELS_DIR / "metrics.json").write_text(json.dumps(all_metrics, indent=2))
    (MODELS_DIR / "default_model.json").write_text(json.dumps({"default": best["model"]}, indent=2))
    (MODELS_DIR / "sample_input.json").write_text(json.dumps(sample_input, indent=2))

    print()
    print(f"Best model by RMSE on held out real COSMOS UK data: {best['model']}")
    print(f"Total committed model size: {total_size:.2f} MB")

    return all_metrics, best


if __name__ == "__main__":
    run()
