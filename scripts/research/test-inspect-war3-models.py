"""Synthetic fixtures only: no Blizzard assets required."""
import importlib.util
import struct
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("survey", Path(__file__).with_name("inspect-war3-models.py"))
survey = importlib.util.module_from_spec(spec)
spec.loader.exec_module(survey)


def u32(n):
    return struct.pack("<I", n)


def geoset(width, lod=True):
    body = b""
    for tag, count, stride in ((b"VRTX", 1, 12), (b"NRMS", 1, 12), (b"PTYP", 1, 4),
                               (b"PCNT", 1, 4), (b"PVTX", 3, 2), (b"GNDX", 0, 1),
                               (b"MTGC", 0, 4), (b"MATS", 0, 4)):
        body += tag + u32(count) + bytes(count * stride)
    body += bytes(12 + (84 if lod else 0) + 28) + u32(0)
    if width:
        body += b"TANG" + u32(1) + bytes(16)
        body += b"SKIN" + u32(8) + struct.pack("<" + ("B" if width == 1 else "H") * 8,
            110 if width == 1 else 365, 0, 0, 0, 255, 0, 0, 0)
    body += b"UVAS" + u32(1) + b"UVBS" + u32(1) + bytes(8)
    return u32(len(body) + 4) + body


class SurveyTests(unittest.TestCase):
    def test_skin_width_is_structural(self):
        for width in (0, 1, 2):
            layout = survey.inspect_geoset(geoset(width))
            self.assertEqual(layout["skin_element_bytes"], width)
            if width:
                self.assertEqual(layout["weight_sum_range"], [255, 255])
        self.assertEqual(survey.inspect_geoset(geoset(2))["max_bone_index"], 365)

    def test_classic_without_lod(self):
        self.assertFalse(survey.inspect_geoset(geoset(0, False))["lod_fields"])

    def test_reject_truncation(self):
        with self.assertRaises(ValueError):
            survey.inspect_geoset(geoset(2)[:-1])
        with self.assertRaises(ValueError):
            survey.inspect_mdx(b"MDLXGEOS" + u32(999))

    def test_texture_records_not_regex(self):
        tex = u32(0) + b"Units/Human/Footman/footman_Diffuse.tif".ljust(260, b"\0") + u32(3)
        result = survey.inspect_mdx(b"MDLXTEXS" + u32(len(tex)) + tex)
        self.assertTrue(result["textures"][0]["path"].endswith(".tif"))

    def test_modern_and_legacy_material(self):
        layer = u32(68) + bytes(48) + u32(1) + u32(1) + u32(3) + u32(0)
        modern = u32(88) + bytes(8) + b"LAYS" + u32(1) + layer
        self.assertEqual(survey.inspect_material(modern)["layers"][0]["slots"], [{"texture": 3, "slot": 0}])
        legacy_layer = u32(52) + bytes(48)
        legacy = u32(152) + bytes(8) + b"Shader_HD_DefaultUnit".ljust(80, b"\0") + b"LAYS" + u32(1) + legacy_layer
        self.assertEqual(survey.inspect_material(legacy)["lays_offset"], 92)


if __name__ == "__main__":
    unittest.main()
