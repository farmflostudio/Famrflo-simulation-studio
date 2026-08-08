from language_layer.guardrail import template_explanation, verify_explanation

NUMBERS = {"horizonDays": 7, "totalWaterMm": 40.96, "irrigationDays": 2}


def test_verify_explanation_passes_when_numbers_match():
    text = "Apply a total of 40.96 mm of irrigation across 2 irrigation days this week."
    assert verify_explanation(text, NUMBERS) is True


def test_verify_explanation_tolerates_rounding():
    text = "Apply a total of 41.0 mm of irrigation across 2 irrigation days this week."
    assert verify_explanation(text, NUMBERS) is True


def test_verify_explanation_fails_when_total_water_is_wrong():
    text = "Apply about 12.0 mm of water across 2 irrigation days this week."
    assert verify_explanation(text, NUMBERS) is False


def test_verify_explanation_fails_when_irrigation_days_is_wrong():
    text = "Apply a total of 40.96 mm of irrigation across 5 irrigation days this week."
    assert verify_explanation(text, NUMBERS) is False


def test_verify_explanation_fails_with_no_numbers():
    text = "Water your crops as needed based on conditions."
    assert verify_explanation(text, NUMBERS) is False


def test_verify_explanation_fails_on_empty_text():
    assert verify_explanation("", NUMBERS) is False
    assert verify_explanation(None, NUMBERS) is False


def test_template_explanation_mentions_the_real_numbers():
    text = template_explanation(NUMBERS)
    assert "41.0" in text
    assert "2 irrigation days" in text
    assert "7 days" in text


def test_template_explanation_handles_zero_irrigation():
    text = template_explanation({"horizonDays": 7, "totalWaterMm": 0.0, "irrigationDays": 0})
    assert "No irrigation is needed" in text
