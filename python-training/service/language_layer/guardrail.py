import re

NUMBER_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")


def _extract_numbers(text):
    return [float(match) for match in NUMBER_PATTERN.findall(text)]


def _mentions_number(numbers_in_text, target, tolerance):
    return any(abs(n - target) <= tolerance for n in numbers_in_text)


def verify_explanation(explanation, numbers):
    if not explanation or not explanation.strip():
        return False

    found = _extract_numbers(explanation)
    if not found:
        return False

    total_water_ok = _mentions_number(
        found, numbers["totalWaterMm"], tolerance=max(0.5, numbers["totalWaterMm"] * 0.05)
    )
    irrigation_days_ok = _mentions_number(found, numbers["irrigationDays"], tolerance=0.5)

    return total_water_ok and irrigation_days_ok


def template_explanation(numbers):
    total = numbers["totalWaterMm"]
    days = numbers["irrigationDays"]
    horizon = numbers["horizonDays"]

    if days == 0:
        return (
            f"No irrigation is needed over the next {horizon} days. Forecast rainfall and current "
            f"soil moisture are expected to stay above the wilting point on their own."
        )

    day_word = "day" if days == 1 else "days"
    return (
        f"Apply a total of {total:.1f} mm of irrigation across {days} irrigation {day_word} over the "
        f"next {horizon} days, following the recommended plan below."
    )
