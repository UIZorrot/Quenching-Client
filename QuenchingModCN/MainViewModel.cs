using System;
using System.Collections.Generic;
using System.IO;
using System.ComponentModel;

public class MainViewModel : INotifyPropertyChanged
{
    private Dictionary<string, string> _contentDictionary = new Dictionary<string, string>();

    public string this[string key]
    {
        get => _contentDictionary.ContainsKey(key) ? _contentDictionary[key] : string.Empty;
        set
        {
            if (_contentDictionary.ContainsKey(key))
            {
                _contentDictionary[key] = value;
                OnPropertyChanged($"Item[{key}]");
            }
            else
            {
                _contentDictionary.Add(key, value);
                OnPropertyChanged($"Item[{key}]");
            }
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    public MainViewModel()
    {
        // 初始化时加载默认文件
        LoadContentFromFile("./quenching/hc-trans.que");
    }

    public void ReloadContentFromFile(string filePath)
    {
        LoadContentFromFile(filePath);
        // 通知所有绑定的属性更新
        OnPropertyChanged(null); // null参数通知所有绑定属性更新
    }

    private void LoadContentFromFile(string filePath)
    {
        _contentDictionary.Clear();
        try
        {
            using (StreamReader reader = new StreamReader(filePath))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    int delimiterIndex = line.IndexOf(']');
                    if (delimiterIndex > 0 && line.StartsWith("["))
                    {
                        string key = line.Substring(1, delimiterIndex - 1);
                        string value = line.Substring(delimiterIndex + 1).Trim().Replace("\\n", Environment.NewLine);
                        _contentDictionary[key] = value;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading file: {ex.Message}");
        }
    }
}
