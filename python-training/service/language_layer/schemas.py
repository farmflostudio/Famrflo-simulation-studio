from typing import Literal, Optional

from pydantic import BaseModel, Field, create_model


class FarmConfigSuggestionBase(BaseModel):
    name: str = Field(description="A short, human friendly farm name based on the description")
    locationLabel: Optional[str] = Field(
        default=None, description="A short place name mentioned or implied in the description, if any"
    )
    areaHectares: Optional[float] = Field(
        default=None, description="Farm area in hectares, only if a number is clearly stated in the description"
    )
    notes: str = Field(description="One short sentence explaining why these values were chosen")


_cached_schema = None


def build_config_schema(categories):
    global _cached_schema
    if _cached_schema is not None:
        return _cached_schema

    soil_type_literal = Literal[tuple(categories["soil_type"])]
    land_cover_literal = Literal[tuple(categories["land_cover"])]

    _cached_schema = create_model(
        "FarmConfigSuggestion",
        __base__=FarmConfigSuggestionBase,
        soilType=(soil_type_literal, Field(description="Closest matching soil type from the allowed list")),
        landCover=(land_cover_literal, Field(description="Closest matching land cover from the allowed list")),
    )
    return _cached_schema
