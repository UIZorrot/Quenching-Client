using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

public class War3TextReader
{
    // 用于存储读取的数据，外层字典是段标题，内层字典是键值对
    private Dictionary<string, Dictionary<string, string>> data = new Dictionary<string, Dictionary<string, string>>();

    // 1. 读取文件
    public void ReadFile(string filePath)
    {
        string[] lines = File.ReadAllLines(filePath);
        Dictionary<string, string> currentSection = null;
        string currentSectionName = null;

        foreach (string line in lines)
        {
            if (line.StartsWith("[") && line.EndsWith("]")) // 识别段标题
            {
                currentSectionName = line.Trim('[', ']');
                currentSection = new Dictionary<string, string>();
                data[currentSectionName] = currentSection;
            }
            else if (line.Contains("=")) // 识别键值对
            {
                var parts = line.Split(new[] { '=' }, 2);
                if (parts.Length == 2 && currentSection != null)
                {
                    currentSection[parts[0]] = parts[1];
                }
            }
        }
    }

    // 2. 查看特定段落中的某个键的值
    public string View(string section, string key)
    {
        if (data.ContainsKey(section) && data[section].ContainsKey(key))
        {
            return data[section][key];
        }
        return null;
    }

    // 3. 修改某个段落中的键值对
    public void Write(string section, string key, string value)
    {
        if (data.ContainsKey(section))
        {
            if (data[section].ContainsKey(key))
            {
                data[section][key] = value;
            }
            else
            {
                data[section].Add(key, value); // 如果不存在此键则添加
            }
        }
        else
        {
            data[section] = new Dictionary<string, string> { { key, value } };
        }
    }

    // 4. 将修改后的内容写回文件
    public void SaveFile(string filePath)
    {
        using (StreamWriter writer = new StreamWriter(filePath))
        {
            foreach (var section in data)
            {
                writer.WriteLine($"[{section.Key}]");
                foreach (var kvp in section.Value)
                {
                    writer.WriteLine($"{kvp.Key}={kvp.Value}");
                }
                writer.WriteLine(); // 段落之间的空行
            }
        }
    }
}

// 示例使用

public class DoodadsEditor
    {
    public static void Example(string[] args)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile("path_to_your_file.txt");

        // 查看某个值
        string numVar = handler.View("ATtr", "numVar");
        Console.WriteLine("ATtr.NumVar: " + numVar);

        // 修改某个值
        handler.Write("ATtr", "numVar", "10");

        // 保存修改后的文件
        handler.SaveFile("path_to_your_file.txt");
    }

    public static void Doodads_to_20(string filePath)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile(filePath);

        handler.Write("ATtr", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenTree");
        handler.Write("BTtw", "texFile", "ReplaceableTextures/tree/t20/BarrensTree/BarrensTree");
        handler.Write("CTtr", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/FelwoodTree");
        handler.Write("FTtw", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronFallTree");
        handler.Write("FTtw", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("LTlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("LTlt", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("WTtw", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronWinterTree");
        handler.Write("WTtw", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("WTst", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSnowTree");
        handler.Write("WTst", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("YTct", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetree");
        handler.Write("YTct", "file", "Doodads/que/d20/Citytree");
        handler.Write("YTwt", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreew");
        handler.Write("YTwt", "file", "Doodads/que/d20/Citytree");
        handler.Write("YTft", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreea");
        handler.Write("YTft", "file", "Doodads/que/d20/Citytree");
        handler.Write("VTlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/lordaeronvillagetree");
        handler.Write("VTlt", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("ATt1", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenTree");
        handler.Write("ATtc", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenCanopyTree");
        handler.Write("JTct", "texFile", "ReplaceableTextures/tree/t20/lordaerontree/lordaeronsummertree");
        handler.Write("JTct", "file", "Doodads/que/d20/lordaerontree/lordaerontree");
        handler.Write("JTtw", "texFile", "ReplaceableTextures/tree/t20/lordaerontree/lordaeronsummertree");
        handler.Write("JTtw", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("BTtc", "texFile", "ReplaceableTextures/tree/t20/BarrensTree/BarrensTree");
        handler.Write("CTtc", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/FelwoodTree");
        handler.Write("LFpt", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");
        handler.Write("LFpt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronFallTree");
        handler.Write("Yts1", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts1", "texFile:hd", "ReplaceableTextures/tree/tc/SilvermoonTree/SilverMoonTree");
        handler.Write("Yts2", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts3", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "file", "Doodads/que/d20/LordaeronTree/LordaeronTree");

        handler.SaveFile(filePath);
    }

    public static void Doodads_to_20_short(string filePath)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile(filePath);

        handler.Write("ATtr", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenTree");
        handler.Write("BTtw", "texFile", "ReplaceableTextures/tree/t20/BarrensTree/BarrensTree");
        handler.Write("CTtr", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/FelwoodTree");
        handler.Write("FTtw", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronFallTree");
        handler.Write("FTtw", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("LTlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("LTlt", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("WTtw", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronWinterTree");
        handler.Write("WTtw", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("WTst", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSnowTree");
        handler.Write("WTst", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("YTct", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetree");
        handler.Write("YTct", "file", "Doodads/que/d20/Citytree");
        handler.Write("YTwt", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreew");
        handler.Write("YTwt", "file", "Doodads/que/d20/Citytree");
        handler.Write("YTft", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreea");
        handler.Write("YTft", "file", "Doodads/que/d20/Citytree");
        handler.Write("VTlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/lordaeronvillagetree");
        handler.Write("VTlt", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("ATt1", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenTree");
        handler.Write("ATtc", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/AshenCanopyTree");
        handler.Write("JTct", "texFile", "ReplaceableTextures/tree/t20/lordaerontree/lordaeronsummertree");
        handler.Write("JTct", "file", "Doodads/que/d20/lordaerontree-short/lordaerontree");
        handler.Write("JTtw", "texFile", "ReplaceableTextures/tree/t20/lordaerontree/lordaeronsummertree");
        handler.Write("JTtw", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("BTtc", "texFile", "ReplaceableTextures/tree/t20/BarrensTree/BarrensTree");
        handler.Write("CTtc", "texFile", "ReplaceableTextures/tree/t20/AshenvaleTree/FelwoodTree");
        handler.Write("LFpt", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");
        handler.Write("LFpt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronFallTree");
        handler.Write("Yts1", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts1", "texFile:hd", "ReplaceableTextures/tree/tc/SilvermoonTree/SilverMoonTree");
        handler.Write("Yts2", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts3", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "texFile", "ReplaceableTextures/tree/t20/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "file", "Doodads/que/d20/lordaerontree-short/LordaeronTree");

        handler.SaveFile(filePath);
    }
    public static void Doodads_to_00(string filePath)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile(filePath);

        handler.Write("ATtr", "texFile", "ReplaceableTextures/tree/t00/AshenvaleTree/AshenTree");
        //handler.Write("BTtw", "texFile", "ReplaceableTextures/tree/t00/BarrensTree/BarrensTree");
        //handler.Write("CTtr", "texFile", "ReplaceableTextures/tree/t00/AshenvaleTree/FelwoodTree");
        handler.Write("FTtw", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronFallTree");
        handler.Write("LTlt", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSummerTree");
        handler.Write("WTtw", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronWinterTree");
        handler.Write("WTst", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSnowTree");
        //handler.Write("YTct", "texFile", "ReplaceableTextures/tree/t00/citytree/cityscapetree");
        //handler.Write("YTwt", "texFile", "ReplaceableTextures/tree/t00/citytree/cityscapetreew");
        //handler.Write("YTft", "texFile", "ReplaceableTextures/tree/t00/citytree/cityscapetreea");
        handler.Write("VTlt", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/lordaeronvillagetree");
        handler.Write("ATt1", "texFile", "ReplaceableTextures/tree/t00/AshenvaleTree/AshenTree");
        handler.Write("ATtc", "texFile", "ReplaceableTextures/tree/t00/AshenvaleTree/AshenCanopyTree");
        handler.Write("JTct", "texFile", "ReplaceableTextures/tree/t00/lordaerontree/DalaranRuinsTree");
        handler.Write("JTtw", "texFile", "ReplaceableTextures/tree/t00/lordaerontree/DalaranRuinsTree");
        //handler.Write("BTtc", "texFile", "ReplaceableTextures/tree/t00/BarrensTree/BarrensTree");
        handler.Write("CTtc", "texFile", "ReplaceableTextures/tree/t00/AshenvaleTree/FelwoodTree");
        handler.Write("LFpt", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronFallTree");
        //handler.Write("Yts1", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSummerTree");
        //handler.Write("Yts1", "texFile:hd", "ReplaceableTextures/tree/t00/SilvermoonTree/SilverMoonTree");
        handler.Write("Yts2", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts3", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "texFile", "ReplaceableTextures/tree/t00/LordaeronTree/LordaeronSummerTree");

        handler.SaveFile(filePath);
    }

    public static void Doodads_to_16(string filePath)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile(filePath);

        handler.Write("ATtr", "texFile", "ReplaceableTextures/tree/t16/AshenvaleTree/AshenTree");
        handler.Write("BTtw", "texFile", "ReplaceableTextures/tree/t16/BarrensTree/BarrensTree");
        handler.Write("CTtr", "texFile", "ReplaceableTextures/tree/t16/AshenvaleTree/FelwoodTree");
        handler.Write("FTtw", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronFallTree");
        handler.Write("FTtw", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("LTlt", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSummerTree");
        handler.Write("LTlt", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("WTtw", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronWinterTree");
        handler.Write("WTtw", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("WTst", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSnowTree");
        handler.Write("WTst", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("YTct", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetree");
        handler.Write("YTct", "file", "Doodads/que/d16/Citytree");
        handler.Write("YTwt", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreew");
        handler.Write("YTwt", "file", "Doodads/que/d16/Citytree");
        handler.Write("YTft", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreea");
        handler.Write("YTft", "file", "Doodads/que/d16/Citytree");
        handler.Write("VTlt", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/lordaeronvillagetree");
        handler.Write("VTlt", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("ATt1", "texFile", "ReplaceableTextures/tree/t16/AshenvaleTree/AshenTree");
        handler.Write("ATtc", "texFile", "ReplaceableTextures/tree/t16/AshenvaleTree/AshenCanopyTree");
        handler.Write("JTct", "texFile", "ReplaceableTextures/tree/t16/lordaerontree/lordaeronsummertree");
        handler.Write("JTct", "file", "Doodads/que/d16/lordaerontree/lordaerontree");
        handler.Write("JTtw", "texFile", "ReplaceableTextures/tree/t16/lordaerontree/lordaeronsummertree");
        handler.Write("JTtw", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("BTtc", "texFile", "ReplaceableTextures/tree/t16/BarrensTree/BarrensTree");
        handler.Write("CTtc", "texFile", "ReplaceableTextures/tree/t16/AshenvaleTree/FelwoodTree");
        handler.Write("LFpt", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");
        handler.Write("LFpt", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronFallTree");
        handler.Write("Yts1", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts1", "texFile:hd", "ReplaceableTextures/tree/tc/SilvermoonTree/SilverMoonTree");
        handler.Write("Yts2", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts3", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "texFile", "ReplaceableTextures/tree/t16/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "file", "Doodads/que/d16/LordaeronTree/LordaeronTree");

        handler.SaveFile(filePath);
    }

    public static void Doodads_to_18(string filePath)
    {
        War3TextReader handler = new War3TextReader();
        handler.ReadFile(filePath);

        handler.Write("ATtr", "texFile", "ReplaceableTextures/tree/t18/AshenvaleTree/AshenTree");
        handler.Write("BTtw", "texFile", "ReplaceableTextures/tree/t18/BarrensTree/BarrensTree");
        handler.Write("CTtr", "texFile", "ReplaceableTextures/tree/t18/AshenvaleTree/FelwoodTree");
        handler.Write("FTtw", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronFallTree");
        handler.Write("FTtw", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("LTlt", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSummerTree");
        handler.Write("LTlt", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("WTtw", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronWinterTree");
        handler.Write("WTtw", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("WTst", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSnowTree");
        handler.Write("WTst", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("YTct", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetree");
        handler.Write("YTct", "file", "Doodads/que/d18/Citytree");
        handler.Write("YTwt", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreew");
        handler.Write("YTwt", "file", "Doodads/que/d18/Citytree");
        handler.Write("YTft", "texFile", "ReplaceableTextures/tree/tc/citytree/cityscapetreea");
        handler.Write("YTft", "file", "Doodads/que/d18/Citytree");
        handler.Write("VTlt", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/lordaeronvillagetree");
        handler.Write("VTlt", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("ATt1", "texFile", "ReplaceableTextures/tree/t18/AshenvaleTree/AshenTree");
        handler.Write("ATtc", "texFile", "ReplaceableTextures/tree/t18/AshenvaleTree/AshenCanopyTree");
        handler.Write("JTct", "texFile", "ReplaceableTextures/tree/t18/lordaerontree/lordaeronsummertree");
        handler.Write("JTct", "file", "Doodads/que/d18/lordaerontree/lordaerontree");
        handler.Write("JTtw", "texFile", "ReplaceableTextures/tree/t18/lordaerontree/lordaeronsummertree");
        handler.Write("JTtw", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("BTtc", "texFile", "ReplaceableTextures/tree/t18/BarrensTree/BarrensTree");
        handler.Write("CTtc", "texFile", "ReplaceableTextures/tree/t18/AshenvaleTree/FelwoodTree");
        handler.Write("LFpt", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");
        handler.Write("LFpt", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronFallTree");
        handler.Write("Yts1", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts1", "texFile:hd", "ReplaceableTextures/tree/tc/SilvermoonTree/SilverMoonTree");
        handler.Write("Yts2", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSummerTree");
        handler.Write("Yts3", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "texFile", "ReplaceableTextures/tree/t18/LordaeronTree/LordaeronSummerTree");
        handler.Write("STlt", "file", "Doodads/que/d18/LordaeronTree/LordaeronTree");

        handler.SaveFile(filePath);
    }
}

public class MdlFileHandler
{
    private List<string> lines = new List<string>();

    // 1. 读取文件
    public void ReadFile(string filePath)
    {
        lines = new List<string>(File.ReadAllLines(filePath));
    }

    // 2. 查看和修改 static AmbIntensity 的值
    public string ViewAmbIntensity()
    {
        foreach (var line in lines)
        {
            if (line.Trim().StartsWith("static AmbIntensity"))
            {
                return line.Trim();
            }
        }
        return null;
    }

    public void WriteAmbIntensity(double newValue)
    {
        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Trim().StartsWith("static AmbIntensity"))
            {
                lines[i] = $"    static AmbIntensity {newValue},";
                break;
            }
        }
    }

    // 3. 查看和修改 static Intensity 的值（按比例调整）
    public string ViewIntensity()
    {
        bool inIntensityBlock = false;
        List<string> intensityBlock = new List<string>();
        foreach (var line in lines)
        {
            if (line.Trim().StartsWith("Intensity"))
            {
                inIntensityBlock = true;
            }
            if (inIntensityBlock)
            {
                intensityBlock.Add(line);
                if (line.Trim().EndsWith("}"))
                {
                    break;
                }
            }
        }
        return string.Join("\n", intensityBlock);
    }

    public void WriteIntensity(double baseValue)
    {
        // 定义预设比例
        var timeAndValues = new Dictionary<int, double>
        {
            { 0, baseValue },
            { 14000, baseValue },
            { 16000, baseValue * 1.28 },
            { 44000, baseValue * 1.28 },
            { 45000, baseValue * 1.4 },
            { 46000, baseValue }
        };

        bool inIntensityBlock = false;
        int index = 0;

        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Trim().StartsWith("Intensity"))
            {
                inIntensityBlock = true;
                index = 0;
            }

            if (inIntensityBlock && lines[i].Trim().EndsWith("}"))
            {
                inIntensityBlock = false;
            }

            if (inIntensityBlock && Regex.IsMatch(lines[i].Trim(), @"\d+:\s*[\d\.]+"))
            {
                var time = new List<int>(timeAndValues.Keys)[index];
                var value = timeAndValues[time];
                lines[i] = $"        {time}: {Math.Round(value, 1)},";
                index++;
            }
        }
    }

    // 4. 查看和修改 Rotation 的值
    public string ViewRotation()
    {
        bool inRotationBlock = false;
        List<string> rotationBlock = new List<string>();
        foreach (var line in lines)
        {
            if (line.Trim().StartsWith("Rotation"))
            {
                inRotationBlock = true;
            }
            if (inRotationBlock)
            {
                rotationBlock.Add(line);
                if (line.Trim().EndsWith("}"))
                {
                    break;
                }
            }
        }
        return string.Join("\n", rotationBlock);
    }

    public void WriteRotation(string newValues)
    {
        bool inRotationBlock = false;
        int startIndex = -1;

        for (int i = 0; i < lines.Count; i++)
        {
            if (lines[i].Trim().StartsWith("Rotation"))
            {
                inRotationBlock = true;
                startIndex = i;
            }

            if (inRotationBlock && lines[i].Trim().EndsWith("}"))
            {
                // 移除 `Rotation 1 { ... }` 中的所有内容
                lines.RemoveRange(startIndex + 1, i - startIndex - 1);

                // 添加新的内容
                lines.Insert(startIndex + 1, newValues);

                // 退出循环
                break;
            }
        }
    }

    // 5. 保存修改后的文件
    public void SaveFile(string filePath)
    {
        File.WriteAllLines(filePath, lines);
    }

    public static void Light_to_rotation(string file, double ambIntense, double Intense)
    {
        MdlFileHandler handler = new MdlFileHandler();
        handler.ReadFile(file);

        // 查看和修改 AmbIntensity
        handler.WriteAmbIntensity(ambIntense);

        // 查看和修改 Intensity
        handler.WriteIntensity(Intense);

        // 查看和修改 Rotation
        string newRotationValues = "        Linear,\n" +
                                   "        0: { -0.254169, 0.212402, 0.75, -0.02 },\n" +
                                   "        15000: { -0.254169, -0.222402, 0.75, -0.02 },\n" +
                                   "        30000: { 0.264169, -0.252402, 0.75, -0.02 },\n" +
                                   "        45000: { 0.254169, 0.222402, 0.75, -0.02 },\n" +
                                   "        60000: { -0.254169, 0.212402, 0.75, -0.02 },";
        handler.WriteRotation(newRotationValues);

        handler.SaveFile(file);
    }

    public static void Light_to_static(string file, double ambIntense, double Intense)
    {
        MdlFileHandler handler = new MdlFileHandler();
        handler.ReadFile(file);

        // 查看和修改 AmbIntensity
        handler.WriteAmbIntensity(ambIntense);

        // 查看和修改 Intensity
        handler.WriteIntensity(Intense);

        // 查看和修改 Rotation
        string newRotationValues = "        Linear,\n" +
                                   "        0: { -0.254169, 0.212402, 0.75, -0.02 },\n";
        handler.WriteRotation(newRotationValues);

        handler.SaveFile(file);
    }

    public static void Light_to_melee(string file, double ambIntense, double Intense)
    {
        MdlFileHandler handler = new MdlFileHandler();
        handler.ReadFile(file);

        // 查看和修改 AmbIntensity
        handler.WriteAmbIntensity(ambIntense);

        // 查看和修改 Intensity
        handler.WriteIntensity(Intense);

        // 查看和修改 Rotation
        string newRotationValues = "        Linear,\n" +
                                   "        0: { -0.2, 0.2, 1, -0.02 },\n";
        handler.WriteRotation(newRotationValues);

        handler.SaveFile(file);
    }
}
