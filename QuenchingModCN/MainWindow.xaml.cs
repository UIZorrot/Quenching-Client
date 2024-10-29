using Microsoft.Win32;
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using StormLibWarp;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using WFChangeKey;
using ICSharpCode.SharpZipLib.Zip;
using System.Management;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using CASCLibNET;
using System.ComponentModel;
using System.Collections.ObjectModel;
using StormLibSharp;
using StormLibWarp;


namespace QuenchingModCN
{
    /// <summary>
    /// MainWindow.xaml 的交互逻辑 DownloadFile("http://gitee.com/Quenchingvio/Quenchingvio/raw/master/environment/foliage/blight/bones/foliage_blight_bone_00.mdx",".//");
    /// </summary>

    public partial class MainWindow : Window
    {
        // public int c = QConst.ID_MPQ;
        public int oldorsd = 0;

        /*
        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.I1)]
        static extern bool CreateSymbolicLink(string SymbolicFileName, string TargetFileName, UInt32 Flags);

        const UInt32 SymbolicLinkFlagFile = 0;
        const UInt32 SymbolicLinkFlagDirectory = 1;

        
        static void Main(string[] args)
        {
            string target = @"E:\TTPmusic";
            string link = @"E:\music";
            bool succ = CreateSymbolicLink(link, target, SymbolicLinkFlagDirectory);
            Console.WriteLine(succ);
        }
        */

        public int zipmaxint = 800;
        public void unZipFiledist(string TargetFile, string fileDir)
        {
            //this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = zipmaxint; pbtext2.Text = mainstring[9]; });
            //string TargetFile = quezipfile;
            //string fileDir = dir_root;
            string rootFile = " ";
            try
            {
                //读取压缩文件(zip文件),准备解压缩
                ZipInputStream s = new ZipInputStream(File.OpenRead(TargetFile.Trim()));
                ZipEntry theEntry;
                string path = fileDir;
                //解压出来的文件保存的路径
                //Console.WriteLine(path);
                string rootDir = " ";
                //根目录下的第一个子文件夹的名称
                while ((theEntry = s.GetNextEntry()) != null)
                {
                    rootDir = Path.GetDirectoryName(theEntry.Name);
                    Console.WriteLine(theEntry.Name);
                    //得到根目录下的第一级子文件夹的名称
                    if (rootDir.IndexOf("\\") >= 0)
                    {
                        rootDir = rootDir.Substring(0, rootDir.IndexOf("\\") + 1);
                    }
                    string dir = Path.GetDirectoryName(theEntry.Name);
                    //根目录下的第一级子文件夹的下的文件夹的名称
                    string fileName = Path.GetFileName(theEntry.Name);
                    //根目录下的文件名称
                    if (dir != " ")
                    //创建根目录下的子文件夹,不限制级别
                    {
                        if (!Directory.Exists(fileDir + "\\" + dir))
                        {
                            path = fileDir + "\\" + dir;
                            //在指定的路径创建文件夹
                            Directory.CreateDirectory(path);
                        }
                    }
                    else if (dir == " " && fileName != "")
                    //根目录下的文件
                    {
                        path = fileDir;
                        rootFile = fileName;
                    }
                    else if (dir != " " && fileName != "")
                    //根目录下的第一级子文件夹下的文件
                    {
                        if (dir.IndexOf("\\") > 0)
                        //指定文件保存的路径
                        {
                            path = fileDir + "\\" + dir;
                        }
                    }

                    //if (dir == rootDir)
                    //判断是不是需要保存在根目录下的文件
                    //{
                    //    path = fileDir + "\\" + rootDir;
                    //}

                    //以下为解压缩zip文件的基本步骤
                    //基本思路就是遍历压缩文件里的所有文件,创建一个相同的文件。
                    if (fileName != String.Empty)
                    {
                        path = theEntry.Name;
                        // this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = zipmaxint; });
                        //path = path + Path.GetDirectoryName(theEntry.Name);
                        //Console.WriteLine(Path.GetDirectoryName(theEntry.Name));

                        path = fileDir + "/" + path;
                        Console.WriteLine("unzip" + path);
                        //if (File.Exists(path + "\\" + fileName)) { File.Delete(path + "\\" + fileName); }
                        FileStream streamWriter = File.Create(path);
                        //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + fileName; });
                        int size = 2048;
                        byte[] data = new byte[2048];
                        while (true)
                        {
                            size = s.Read(data, 0, data.Length);
                            if (size > 0)
                            {
                                streamWriter.Write(data, 0, size);
                            }
                            else
                            {
                                break;
                            }
                        }

                        streamWriter.Close();
                    }
                }
                Console.WriteLine("after 1");
                s.Close();
                //this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                //MessageBox.Show(mbtext[22]);

            }
            catch (Exception ex)
            {
                //this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                MessageBox.Show(ex.ToString());
            }

        }
        public void unZipFile()
        {
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = zipmaxint; pbtext2.Text = mainstring[9]; });
            string TargetFile = quezipfile;
            string fileDir = dir_root;
            string rootFile = " ";
            try
            {
                //读取压缩文件(zip文件),准备解压缩
                ZipInputStream s = new ZipInputStream(File.OpenRead(TargetFile.Trim()));
                ZipEntry theEntry;
                string path = fileDir;
                //解压出来的文件保存的路径

                string rootDir = " ";
                //根目录下的第一个子文件夹的名称
                while ((theEntry = s.GetNextEntry()) != null)
                {
                    rootDir = Path.GetDirectoryName(theEntry.Name);
                    //得到根目录下的第一级子文件夹的名称
                    if (rootDir.IndexOf("\\") >= 0)
                    {
                        rootDir = rootDir.Substring(0, rootDir.IndexOf("\\") + 1);
                    }
                    string dir = Path.GetDirectoryName(theEntry.Name);
                    //根目录下的第一级子文件夹的下的文件夹的名称
                    string fileName = Path.GetFileName(theEntry.Name);
                    //根目录下的文件名称
                    if (dir != " ")
                    //创建根目录下的子文件夹,不限制级别
                    {
                        if (!Directory.Exists(fileDir + "\\" + dir))
                        {
                            path = fileDir + "\\" + dir;
                            //在指定的路径创建文件夹
                            Directory.CreateDirectory(path);
                        }
                    }
                    else if (dir == " " && fileName != "")
                    //根目录下的文件
                    {
                        path = fileDir;
                        rootFile = fileName;
                    }
                    else if (dir != " " && fileName != "")
                    //根目录下的第一级子文件夹下的文件
                    {
                        if (dir.IndexOf("\\") > 0)
                        //指定文件保存的路径
                        {
                            path = fileDir + "\\" + dir;
                        }
                    }

                    //if (dir == rootDir)
                    //判断是不是需要保存在根目录下的文件
                    //{
                    //    path = fileDir + "\\" + rootDir;
                    //}

                    //以下为解压缩zip文件的基本步骤
                    //基本思路就是遍历压缩文件里的所有文件,创建一个相同的文件。
                    if (fileName != String.Empty)
                    {
                        this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = zipmaxint; });
                        path = dir_root + Path.GetDirectoryName(theEntry.Name);
                        path = path.Replace('/', '\\');
                        Console.WriteLine(path + "\\" + fileName);
                        //if (File.Exists(path + "\\" + fileName)) { File.Delete(path + "\\" + fileName); }
                        FileStream streamWriter = File.Create(path + "\\" + fileName);
                        this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + fileName; });
                        int size = 2048;
                        byte[] data = new byte[2048];
                        while (true)
                        {
                            size = s.Read(data, 0, data.Length);
                            if (size > 0)
                            {
                                streamWriter.Write(data, 0, size);
                            }
                            else
                            {
                                break;
                            }
                        }

                        streamWriter.Close();
                    }
                }
                s.Close();
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                MessageBox.Show(mbtext[22]);
                GPUbool = 0;
                w3cbool = 0;
            }
            catch (Exception ex)
            {
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                MessageBox.Show(mbtext[21]);
            }

        }
        public void unZipFileLZD()
        {
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = zipmaxint; pbtext2.Text = mainstring[9]; });
            string TargetFile = quezipfile;
            string fileDir = dir_root;
            string rootFile = " ";
            try
            {
                //读取压缩文件(zip文件),准备解压缩
                ZipInputStream s = new ZipInputStream(File.OpenRead(TargetFile.Trim()));
                ZipEntry theEntry;
                string path = fileDir;
                //解压出来的文件保存的路径

                string rootDir = " ";
                //根目录下的第一个子文件夹的名称
                while ((theEntry = s.GetNextEntry()) != null)
                {
                    rootDir = Path.GetDirectoryName(theEntry.Name);
                    //得到根目录下的第一级子文件夹的名称
                    if (rootDir.IndexOf("\\") >= 0)
                    {
                        rootDir = rootDir.Substring(0, rootDir.IndexOf("\\") + 1);
                    }
                    string dir = Path.GetDirectoryName(theEntry.Name);
                    //根目录下的第一级子文件夹的下的文件夹的名称
                    string fileName = Path.GetFileName(theEntry.Name);
                    //根目录下的文件名称
                    if (dir != " ")
                    //创建根目录下的子文件夹,不限制级别
                    {
                        if (!Directory.Exists(fileDir + "\\" + dir))
                        {
                            path = fileDir + "\\" + dir;
                            //在指定的路径创建文件夹
                            Directory.CreateDirectory(path);
                        }
                    }
                    else if (dir == " " && fileName != "")
                    //根目录下的文件
                    {
                        path = fileDir;
                        rootFile = fileName;
                    }
                    else if (dir != " " && fileName != "")
                    //根目录下的第一级子文件夹下的文件
                    {
                        if (dir.IndexOf("\\") > 0)
                        //指定文件保存的路径
                        {
                            path = fileDir + "\\" + dir;
                        }
                    }

                    //if (dir == rootDir)
                    //判断是不是需要保存在根目录下的文件
                    //{
                    //    path = fileDir + "\\" + rootDir;
                    //}

                    //以下为解压缩zip文件的基本步骤
                    //基本思路就是遍历压缩文件里的所有文件,创建一个相同的文件。
                    if (fileName != String.Empty)
                    {
                        this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = zipmaxint; });
                        path = dir_root + Path.GetDirectoryName(theEntry.Name);
                        path = path.Replace('/', '\\');
                        Console.WriteLine(path + "\\" + fileName);
                        //if (File.Exists(path + "\\" + fileName)) { File.Delete(path + "\\" + fileName); }
                        FileStream streamWriter = File.Create(path + "\\" + fileName);
                        this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + fileName; });
                        int size = 2048;
                        byte[] data = new byte[2048];
                        while (true)
                        {
                            size = s.Read(data, 0, data.Length);
                            if (size > 0)
                            {
                                streamWriter.Write(data, 0, size);
                            }
                            else
                            {
                                break;
                            }
                        }

                        streamWriter.Close();
                    }
                }
                s.Close();
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                GPUbool = 0;
                w3cbool = 0;
                //MessageBox.Show(mbtext[22]);
            }
            catch (Exception ex)
            {
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                //MessageBox.Show(mbtext[21]);
            }

        }
        public class CASCFile : INotifyPropertyChanged
        {
            private string _FileName { get; set; }

            public string FileName
            {
                get
                {
                    return _FileName;
                }
                set
                {
                    _FileName = value;
                    OnPropertyChanged("FileName");
                }
            }

            private long _Size { get; set; }

            public long Size
            {
                get
                {
                    return _Size;
                }
                set
                {
                    _Size = value;
                    OnPropertyChanged("Size");
                }
            }

            private string _IsLocal { get; set; }

            public string IsLocal
            {
                get
                {
                    return _IsLocal;
                }
                set
                {
                    _IsLocal = value;
                    OnPropertyChanged("IsLocal");
                }
            }

            public CASCFile(string fileName, long fileSize, bool isLocal)
            {
                FileName = fileName;
                Size = fileSize;
                IsLocal = isLocal ? "Yes" : "No";
            }

            public event PropertyChangedEventHandler PropertyChanged;

            protected void OnPropertyChanged(string name)
            {
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
            }
        }
        public ObservableCollection<CASCFile> CASCFiles { get; } = new ObservableCollection<CASCFile>();
        CASCStorage Storage { get; set; }
        public void anitvio()
        {
            string temps;
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = 1800; pbtext2.Text = mainstring[9]; });
            try
            {
                Storage = new CASCStorage(dir_root);
                foreach (var file in Storage.Files)
                {
                    if (mwclose == true) { return; }
                    try
                    {

                        if (file.FileName.Contains("war3.w3mod:_hd.w3mod:_teen.w3mod:units") || file.FileName.Contains("war3.w3mod:_hd.w3mod:_teen.w3mod:buildings") || file.FileName.Contains("war3.w3mod:_hd.w3mod:_teen.w3mod:doodads"))
                        {
                            if (!File.Exists(dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_teen.w3mod:", "")))
                            {
                                temps = dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_teen.w3mod:", "");
                                //重定向
                                if (temps.Contains("creeps\\") && Directory.Exists(dir_root + "units/creeps-dis")) { temps = temps.Replace("creeps\\", "creeps-dis\\"); }
                                if (temps.Contains("critters\\") && Directory.Exists(dir_root + "units/critters-dis")) { temps = temps.Replace("critters\\", "critters-dis\\"); }
                                if (temps.Contains("demon\\") && Directory.Exists(dir_root + "units/demon-dis")) { temps = temps.Replace("demon\\", "demon-dis\\"); }
                                if (temps.Contains("human\\") && Directory.Exists(dir_root + "units/human-dis")) { temps = temps.Replace("human\\", "human-dis\\"); }
                                if (temps.Contains("naga\\") && Directory.Exists(dir_root + "units/naga-dis")) { temps = temps.Replace("naga\\", "naga-dis\\"); }
                                if (temps.Contains("nightelf\\") && Directory.Exists(dir_root + "units/nightelf-dis")) { temps = temps.Replace("nightelf\\", "nightelf-dis\\"); }
                                if (temps.Contains("orc\\") && Directory.Exists(dir_root + "units/orc-dis")) { temps = temps.Replace("orc\\", "orc-dis\\"); }
                                if (temps.Contains("other\\") && Directory.Exists(dir_root + "units/other-dis")) { temps = temps.Replace("other\\", "other-dis\\"); }
                                if (temps.Contains("undead\\") && Directory.Exists(dir_root + "units/undead-dis")) { temps = temps.Replace("undead\\", "undead-dis\\"); }
                                if (temps.Contains("buildings\\") && Directory.Exists(dir_root + "buildings-dis")) { temps = temps.Replace("buildings\\", "buildings-dis\\"); }
                                if (temps.Contains("doodads\\") && Directory.Exists(dir_root + "doodads-dis")) { temps = temps.Replace("doodads\\", "doodads-dis\\"); }
                                if (!Directory.Exists(Path.GetDirectoryName(temps))) { Directory.CreateDirectory(Path.GetDirectoryName(temps)); }

                                using (var input = Storage.OpenFile(file.FileName.Replace("_teen.w3mod:", "")))
                                using (var output = File.Create(temps))
                                {
                                    int size = 2048;
                                    byte[] data = new byte[size];
                                    while (true)
                                    {

                                        int r = input.Read(data, 0, data.Length);
                                        if (r > 0)
                                            output.Write(data, 0, r);
                                        else
                                            break;
                                    }
                                }
                            }
                            this.Dispatcher.Invoke(() => {
                                pbp.Value = pbp.Value + 1; pb.Visibility = Visibility.Visible; pbp.Maximum = 1800;
                                pbtext1.Text = mainstring[9] + dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_teen.w3mod:", "");
                            });
                        }

                    }
                    catch (Exception ex)
                    {
                        //MessageBox.Show(ex.Message);
                    }
                }
                WriteIniInt("set", "vio", 1);
                this.Dispatcher.Invoke(() => {
                    pb.Visibility = Visibility.Hidden;
                });
                this.Dispatcher.Invoke(() => {
                    setbtn_about_Copy1.Visibility = Visibility.Visible;
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(mbtext[47]); this.Dispatcher.Invoke(() => {
                    pb.Visibility = Visibility.Hidden;
                }); return;
            }
        }
        public void English_Voice()
        {
            string temps;
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = 1800; pbtext2.Text = mainstring[9]; });
            try
            {
                Storage = new CASCStorage(dir_root);
                foreach (var file in Storage.Files)
                {
                    if (mwclose == true) { return; }
                    try
                    {
                        if (file.FileName.Contains("war3.w3mod:_locales\\enus.w3mod:") && !file.FileName.Contains(".fdf") && !file.FileName.Contains(".txt") && !file.FileName.Contains("_hd.w3mod")) 
                        {
                            if (!File.Exists(dir_root + file.FileName.Replace("war3.w3mod:_locales\\enus.w3mod:", "")))
                            {
                                temps = dir_root + file.FileName.Replace("war3.w3mod:_locales\\enus.w3mod:", "");
                                //重定向
                               
                                if (!Directory.Exists(Path.GetDirectoryName(temps))) { Directory.CreateDirectory(Path.GetDirectoryName(temps)); }

                                using (var input = Storage.OpenFile(file.FileName))
                                using (var output = File.Create(temps))
                                {
                                    int size = 2048;
                                    byte[] data = new byte[size];
                                    while (true)
                                    {

                                        int r = input.Read(data, 0, data.Length);
                                        if (r > 0)
                                            output.Write(data, 0, r);
                                        else
                                            break;
                                    }
                                }
                            }
                            this.Dispatcher.Invoke(() => {
                                pbp.Value = pbp.Value + 1; pb.Visibility = Visibility.Visible; pbp.Maximum = 4500;
                                pbtext1.Text = mainstring[9] + dir_root + file.FileName.Replace("war3.w3mod:_locales\\enus.w3mod:", "");
                            });
                        }

                    }
                    catch (Exception ex)
                    {
                        //MessageBox.Show(ex.Message);
                    }
                }
                foreach (var file in Storage.Files)
                {
                    if (mwclose == true) { return; }
                    try
                    {
                        if (file.FileName.Contains("war3.w3mod:_hd.w3mod:_locales\\enus.w3mod:") && !file.FileName.Contains(".fdf") && !file.FileName.Contains(".txt") )
                        {
                            if (!File.Exists(dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_locales\\enus.w3mod:", "")))
                            {
                                temps = dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_locales\\enus.w3mod:", "");
                                //重定向

                                if (!Directory.Exists(Path.GetDirectoryName(temps))) { Directory.CreateDirectory(Path.GetDirectoryName(temps)); }

                                using (var input = Storage.OpenFile(file.FileName))
                                using (var output = File.Create(temps))
                                {
                                    int size = 2048;
                                    byte[] data = new byte[size];
                                    while (true)
                                    {

                                        int r = input.Read(data, 0, data.Length);
                                        if (r > 0)
                                            output.Write(data, 0, r);
                                        else
                                            break;
                                    }
                                }
                            }
                            this.Dispatcher.Invoke(() => {
                                pbp.Value = pbp.Value + 1; pb.Visibility = Visibility.Visible; pbp.Maximum = 4500;
                                pbtext1.Text = mainstring[9] + dir_root + file.FileName.Replace("war3.w3mod:_hd.w3mod:_locales\\enus.w3mod:", "");
                            });
                        }

                    }
                    catch (Exception ex)
                    {
                        //MessageBox.Show(ex.Message);
                    }
                }
                WriteIniInt("set", "sound", 1);
                this.Dispatcher.Invoke(() => {
                    pb.Visibility = Visibility.Hidden;
                });
                this.Dispatcher.Invoke(() => {
                    setbtn_about_Copy1.Visibility = Visibility.Visible;
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(mbtext[47]); this.Dispatcher.Invoke(() => {
                    pb.Visibility = Visibility.Hidden;
                }); return;
            }
        }
        
        public string severurl = "http://tianxiazhengyi.net/";
        public string fseverurl = "http://tianxiazhengyi.net/";
        public int writegrid(int i)
        {

            string temp = File.ReadAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt");
            string[] strArray = temp.Split('[');
            temp = "";
            WriteIniString("numkey", "1", num1.Text);
            WriteIniString("numkey", "2", num2.Text);
            WriteIniString("numkey", "3", num3.Text);
            WriteIniString("numkey", "4", num4.Text);
            WriteIniString("numkey", "5", num5.Text);
            WriteIniString("numkey", "6", num6.Text);
            try
            {
                if (i == 2)//物品
                {
                    for (var j = 1; j < strArray.Length; j++)
                    {
                        //Console.WriteLine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt");
                        //Custom Hotkeys 0]
                        if (strArray[j].Contains("Commandbar Hotkeys 00"))
                        {
                            strArray[j] = "Commandbar Hotkeys 00]" + Environment.NewLine + "Hotkey=" + ckey(ck1.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "1", ck1.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 01"))
                        {
                            strArray[j] = "Commandbar Hotkeys 01]" + Environment.NewLine + "Hotkey=" + ckey(ck2.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "2", ck2.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 02"))
                        {
                            strArray[j] = "Commandbar Hotkeys 02]" + Environment.NewLine + "Hotkey=" + ckey(ck3.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "3", ck3.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 03"))
                        {
                            strArray[j] = "Commandbar Hotkeys 03]" + Environment.NewLine + "Hotkey=" + ckey(ck4.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "4", ck4.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 10"))
                        {
                            strArray[j] = "Commandbar Hotkeys 10]" + Environment.NewLine + "Hotkey=" + ckey(ck5.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "5", ck5.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 11"))
                        {
                            strArray[j] = "Commandbar Hotkeys 11]" + Environment.NewLine + "Hotkey=" + ckey(ck6.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "6", ck6.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 12"))
                        {
                            strArray[j] = "Commandbar Hotkeys 12]" + Environment.NewLine + "Hotkey=" + ckey(ck7.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "7", ck7.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 13"))
                        {
                            strArray[j] = "Commandbar Hotkeys 13]" + Environment.NewLine + "Hotkey=" + ckey(ck8.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "8", ck8.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 20"))
                        {
                            strArray[j] = "Commandbar Hotkeys 20]" + Environment.NewLine + "Hotkey=" + ckey(ck9.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "9", ck9.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 21"))
                        {
                            strArray[j] = "Commandbar Hotkeys 21]" + Environment.NewLine + "Hotkey=" + ckey(ck10.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "10", ck10.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 22"))
                        {
                            strArray[j] = "Commandbar Hotkeys 22]" + Environment.NewLine + "Hotkey=" + ckey(ck11.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "11", ck11.Text);
                        }
                        if (strArray[j].Contains("Commandbar Hotkeys 23"))
                        {
                            strArray[j] = "Commandbar Hotkeys 23]" + Environment.NewLine + "Hotkey=" + ckey(ck12.Text) + Environment.NewLine + "MetaKeyState=0" + Environment.NewLine + "HeroOnly=" + keyc_hero + Environment.NewLine;
                            WriteIniString("comkey", "12", ck12.Text);
                        }
                        temp = temp + Environment.NewLine + "[" + strArray[j];
                    }
                    File.WriteAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt", temp);
                }
                return 1;
            }
            catch
            {
                return 0;
            }
        }
        [DllImport("USER32.DLL")]

        public static extern int SendMessage(IntPtr hWnd, uint Msg, int wParam, int lParam);
        public string ckey(string str)
        {
            string temp = "";
            if (str == "A") { temp = "65"; }
            if (str == "B") { temp = "66"; }
            if (str == "C") { temp = "67"; }
            if (str == "D") { temp = "68"; }
            if (str == "E") { temp = "69"; }
            if (str == "F") { temp = "70"; }
            if (str == "G") { temp = "71"; }
            if (str == "H") { temp = "72"; }
            if (str == "I") { temp = "73"; }
            if (str == "J") { temp = "74"; }
            if (str == "K") { temp = "75"; }
            if (str == "L") { temp = "76"; }
            if (str == "M") { temp = "77"; }
            if (str == "N") { temp = "78"; }
            if (str == "O") { temp = "79"; }
            if (str == "P") { temp = "80"; }
            if (str == "Q") { temp = "81"; }
            if (str == "R") { temp = "82"; }
            if (str == "S") { temp = "83"; }
            if (str == "T") { temp = "84"; }
            if (str == "U") { temp = "85"; }
            if (str == "V") { temp = "86"; }
            if (str == "W") { temp = "87"; }
            if (str == "X") { temp = "88"; }
            if (str == "Y") { temp = "89"; }
            if (str == "Z") { temp = "90"; }
            if (str == "D0") { temp = "48"; }
            if (str == "D1") { temp = "49"; }
            if (str == "D2") { temp = "50"; }
            if (str == "D3") { temp = "51"; }
            if (str == "D4") { temp = "52"; }
            if (str == "D5") { temp = "53"; }
            if (str == "D6") { temp = "54"; }
            if (str == "D7") { temp = "55"; }
            if (str == "D8") { temp = "55"; }
            if (str == "D9") { temp = "57"; }
            if (str == "+") { temp = "106"; }
            if (str == " ") { temp = "107"; }
            if (str == "-") { temp = "109"; }
            if (str == ".") { temp = "110"; }
            if (str == "/") { temp = "111"; }
            if (str == ";") { temp = "186"; }
            if (str == ":") { temp = "186"; }
            if (str == "=") { temp = "187"; }
            if (str == "+") { temp = "187"; }
            if (str == "F1") { temp = "112"; }
            if (str == "F2") { temp = "113"; }
            if (str == "F3") { temp = "114"; }
            if (str == "F4") { temp = "115"; }
            if (str == "F5") { temp = "116"; }
            if (str == "F6") { temp = "117"; }
            if (str == "F7") { temp = "118"; }
            if (str == "F8") { temp = "119"; }
            if (str == "F9") { temp = "120"; }
            if (str == ",") { temp = "188"; }
            if (str == "<") { temp = "188"; }
            if (str == "-") { temp = "189"; }
            if (str == "_") { temp = "189"; }
            if (str == ".") { temp = "190"; }
            if (str == ">") { temp = "190"; }
            if (str == "/") { temp = "191"; }
            if (str == "?") { temp = "191"; }
            if (str == "`") { temp = "192"; }
            if (str == "~") { temp = "192"; }
            if (str == "[") { temp = "193"; }
            if (str == "{") { temp = "193"; }
            if (str == "|") { temp = "194"; }
            if (str == "]") { temp = "195"; }
            if (str == "Oemtilde") { temp = "192`"; }
            if (str == "Oem7") { temp = "222"; }
            if (str == "Oem5") { temp = "220`"; }
            if (str == "LControlKey") { temp = "162"; }
            if (str == "LMenu") { temp = "164"; }
            if (str == "LShiftKey") { temp = "160"; }
            if (str == "SPACE") { temp = "32"; }
            return temp;
        }

        KeyboardHook hook = new KeyboardHook();
        [DllImport("USER32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("USER32.dll")]
        public static extern IntPtr SetForegroundWindow(IntPtr hWnd);
        private bool isHookEnable = false;

        private const int WM_KEYDOWN = 0x100;
        private const int WM_KEYUP = 0x101;
        private IntPtr war3;
        public string[] DNCfile = new string[111];
        public string nump(string a)
        {
            if (a == "1") { return "D1"; }
            if (a == "2") { return "D2"; }
            if (a == "3") { return "D3"; }
            if (a == "4") { return "D4"; }
            if (a == "5") { return "D5"; }
            if (a == "6") { return "D6"; }
            if (a == "7") { return "D7"; }
            if (a == "8") { return "D8"; }
            if (a == "9") { return "D9"; }
            if (a == "0") { return "0"; }
            if (a == "`") { return "Oemtilde"; }
            return a;
        }
        private void t_KeyPress(object sender, System.Windows.Forms.KeyPressEventArgs e)
        {
            //e.Handled = true;
        }
        private void MainWindows_Keydown(object sender, KeyEventArgs e)
        {
            e.Handled = true;
        }
        void hook_OnKeyDownEvent(object sender, System.Windows.Forms.KeyEventArgs e)
        {

            string key = e.KeyCode.ToString();
            int a = e.KeyValue;
            //Console.WriteLine(a);
            //Console.WriteLine(key);

            if (Keyboard.FocusedElement is TextBox)
            { TextBox temp = (TextBox)Keyboard.FocusedElement; WriteIniString("key", temp.Tag.ToString(), key); }

            if (isHookEnable)//
            {
                if (FindWindow(null, "Warcraft III") != IntPtr.Zero)
                {
                    try
                    {
                        Process tprocess = Process.GetProcessesByName("Warcraft III").Where(x => x.MainWindowHandle != IntPtr.Zero).FirstOrDefault();
                        if (tprocess != null) { war3 = tprocess.MainWindowHandle; }
                    }
                    catch { }
                }
                if (Keyboard.FocusedElement is TextBox)
                { TextBox temp = (TextBox)Keyboard.FocusedElement; temp.Text = key; }
                if (war3 != IntPtr.Zero)//
                {

                    //if (checkBox8.Checked && e.Alt) {   }
                    if (!((System.Windows.Forms.Control.ModifierKeys & System.Windows.Forms.Keys.Shift) == System.Windows.Forms.Keys.Shift) && keyc_shift) { return; }
                    Console.WriteLine(key);

                    if (key == nump(num1.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad7, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad7, 0);
                    }
                    else if (key == nump(num2.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad8, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad8, 0);
                    }
                    else if (key == nump(num3.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad4, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad4, 0);
                    }
                    else if (key == nump(num4.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad5, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad5, 0);
                    }
                    else if (key == nump(num5.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad1, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad1, 0);
                    }
                    else if (key == nump(num6.Text))
                    {
                        SetForegroundWindow(war3);
                        SendMessage(war3, WM_KEYDOWN, (int)System.Windows.Forms.Keys.NumPad2, 0);
                        SendMessage(war3, WM_KEYUP, (int)System.Windows.Forms.Keys.NumPad2, 0);
                    }

                    //MessageBox.Show(e.KeyCode.ToString());
                }
                else
                {
                    //throw new Exception("找不到war3！");
                }
                //e.Handled = true;
                //e.SuppressKeyPress = false;
            }
        }

        string strIniFilePath = ".\\Quenching\\config.ini";
        [DllImport("kernel32", CharSet = CharSet.Auto)]
        private static extern long WritePrivateProfileString(string section, string key, string val, string filePath);
        [DllImport("kernel32", CharSet = CharSet.Auto)]
        private static extern long GetPrivateProfileString(string section, string key, string strDefault, StringBuilder retVal, int size, string filePath);
        [DllImport("Kernel32.dll", CharSet = CharSet.Auto)]
        public static extern int GetPrivateProfileInt(string section, string key, int nDefault, string filePath);
        public bool GetIniString(string section, string key, string strDefault, StringBuilder retVal, int size)
        { long liRet = GetPrivateProfileString(section, key, strDefault, retVal, size, strIniFilePath); return (liRet >= 1); }
        public int GetIniInt(string section, string key, int nDefault)
        { return GetPrivateProfileInt(section, key, nDefault, strIniFilePath); }
        public bool WriteIniString(string section, string key, string val)
        { long liRet = WritePrivateProfileString(section, key, val, strIniFilePath); return (liRet != 0); }
        public bool WriteIniInt(string section, string key, int val) { return WriteIniString(section, key, val.ToString()); }

        //[DllImport("StormLib.DLL")]

        public void countfile(string sourceFolder)
        {
            try
            {
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                foreach (string file in filenames)// 遍历所有的文件和目录
                {
                    if (System.IO.Directory.Exists(file))
                    { countfile(file); }
                    else
                    { initnum++; }
                }
            }
            catch (Exception e)
            { }
        }
        public void qjoin(string spath, string dpath)
        {
            FileStream joinFileStream = new FileStream(dpath, FileMode.OpenOrCreate, FileAccess.Write);
            FileStream readStream;
            for (int i = 0; i < 1000; i++)
            {
                try
                {
                    readStream = new FileStream(spath + "-quenching" + i, FileMode.Open, FileAccess.Read);
                    byte[] by = new byte[1024];
                    byte[] buffer = new byte[readStream.Length];
                    int data = 0;
                    if ((data = readStream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        BinaryWriter binary = new BinaryWriter(joinFileStream, Encoding.Default);
                        binary.Write(buffer, 0, data);
                    }
                    readStream.Close();
                }
                catch { i = 1000; }

            }
            joinFileStream.Close();
        }
        public static int DelectDir(string srcPath)
        {
            try
            {
                DirectoryInfo dir = new DirectoryInfo(srcPath);
                FileSystemInfo[] fileinfo = dir.GetFileSystemInfos();
                foreach (FileSystemInfo i in fileinfo)
                {
                    if (i is DirectoryInfo)
                    {
                        DirectoryInfo subdir = new DirectoryInfo(i.FullName);
                        subdir.Delete(true);
                    }
                    else
                    { File.Delete(i.FullName); }
                }
                dir.Delete(true);
                return 1;
            }
            catch (Exception e)
            { return 0; }
        }

        public int checkfilesum = 0;
        public int checkfileflag = 0;
        public string dir_root = "./";
        public Button[] campb = new Button[35];
        public bool[] cosunitlock = new bool[30];
        public string[] setstringt = new string[25];
        public string[] setstringc = new string[25];
        public string[] cosherostring = new string[25];
        public string[] cosheroicon = new string[25];
        public string[] cosheropic = new string[110];
        public string[] cosherodes = new string[80];
        public string[] achstring1 = new string[40];
        public string[] achstring2 = new string[40];
        public string[] achstring3 = new string[40];
        public string[] achstring4 = new string[40];
        public string[] mainstring = new string[40];
        public string[] dlogstring = new string[10];
        public string[] sevstring = new string[50];
        public string[] sevpstring = new string[50];
        public string[] mbtext = new string[120];
        public string[] camptext = new string[120];
        public bool[] achbool = new bool[40];
        public bool[] cosherolock = new bool[40];
        public string[] cosunitstring = new string[100];
        public delegate void checkinvoke(string s1, string s2);
        public string[,,] cos_hero_png = new string[10, 10, 10];
        public string[,] cos_unit_png = new string[10, 10];
        public int[,] cos_hero_now = new int[10, 10];
        public int[,] cos_hero_length = new int[10, 10];
        public int[] cos_unit_length = new int[10];
        public string[,] cos_unit_des = new string[10, 10];
        public string[,,] cos_hero_des = new string[10, 10, 10];
        //public string[] globalstring = new string[250];
        //public string[] globalstringhc = new string[250];
        public int[] cos_unit_now = new int[10];
        public void init()
        {
            int i = 0;
            int j = 0;

            for (i = 0; i < 5; i++)
            {
                for (j = 0; j < 4; j++)
                { cos_hero_now[i, j] = 0; }
            }

            i = 0;
            j = 0;

            for (i = 0; i < 4; i++)
            {
                cos_unit_now[i] = 0;
            }

            i = 0;
            j = 0;


            for (i = 0; i < 4; i++)
            {
                cos_unit_now[i] = GetIniInt("cosunit", i.ToString(), 0);
                //if (cos_hero_now[(i - 1) / 4, (i - 1) % 4] < 0) { cos_hero_now[(i - 1) / 4, (i - 1) % 4] = 0; }
            }

            for (i = 0; i < 25; i++)
            {
                cos_hero_now[i / 4, i % 4] = GetIniInt("coshero", (i+1).ToString(), 0) -    1;
                if (cos_hero_now[(i) / 4, (i) % 4] < 0) { cos_hero_now[(i) / 4, (i) % 4] = 0; }
            }

            cos_unit_length[0] = 3;
            cos_unit_length[1] = 3;
            cos_unit_length[2] = 3;
            cos_unit_length[3] = 2;


            cos_unit_png[0, 0] = "cosu_h1.png";
            cos_unit_png[0, 1] = "cosu_h2.png";
            cos_unit_png[0, 2] = "cosu_h3.png";
            cos_unit_png[1, 0] = "cosu_o1.png";
            cos_unit_png[1, 1] = "cosu_o2.png";
            cos_unit_png[1, 2] = "cosu_o3.png";
            cos_unit_png[2, 0] = "cosu_u1.png";
            cos_unit_png[2, 1] = "cosu_u2.png";
            cos_unit_png[2, 2] = "cosu_u3.png";
            cos_unit_png[3, 0] = "cosu_n1.png";
            cos_unit_png[3, 1] = "cosu_n2.png";

            cos_hero_length[0, 0] = 3;
            cos_hero_length[0, 3] = 1;
            cos_hero_length[0, 2] = 2;
            cos_hero_length[0, 1] = 9;


            cos_hero_png[0, 0, 0] = "cosh_h13.png"; //大法师
            cos_hero_png[0, 0, 1] = "cosh_h14.png"; //吉安娜
            cos_hero_png[0, 0, 2] = "cosh_h12.png"; //精灵大法师
            cos_hero_png[0, 0, 3] = "cosh_h19.png"; //精灵大法师
            cos_hero_png[0, 3, 0] = "cosh_h11.png"; //原版血法师
            cos_hero_png[0, 3, 1] = "cosh_h10.png"; //卡尔
            cos_hero_png[0, 2, 0] = "cosh_h9.png"; //
            cos_hero_png[0, 2, 1] = "cosh_h8.png"; //
            cos_hero_png[0, 2, 2] = "cosh_h7.png"; //csw山丘
            cos_hero_png[0, 1, 0] = "cosh_h18.png";
            cos_hero_png[0, 1, 1] = "cosh_h6.png"; //uther
            cos_hero_png[0, 1, 2] = "cosh_h4.png"; //ather
            cos_hero_png[0, 1, 3] = "cosh_h5.png"; //ather with frost
            cos_hero_png[0, 1, 4] = "cosh_h3.png";// 披风保健
            cos_hero_png[0, 1, 5] = "cosh_h2.png";// 回京使者
            cos_hero_png[0, 1, 6] = "cosh_h1.png";// 锤子盾牌
            cos_hero_png[0, 1, 7] = "cosh_h15.png";//眼罩兜帽剑
            cos_hero_png[0, 1, 8] = "cosh_h16.png";//剑盾
            cos_hero_png[0, 1, 9] = "cosh_h17.png";//海军

            cos_hero_length[1, 0] = 6;
            cos_hero_length[1, 1] = 3;
            cos_hero_length[1, 2] = 1;
            cos_hero_length[1, 3] = 2;

            cos_hero_png[1, 0, 0] = "cosh_o7.png";//剑圣
            cos_hero_png[1, 0, 1] = "cosh_o6.png";//海军
            cos_hero_png[1, 0, 2] = "cosh_o5.png";//海军
            cos_hero_png[1, 0, 3] = "cosh_o4.png";//混沌hellscream
            cos_hero_png[1, 0, 4] = "cosh_o3.png";//混沌剑圣
            cos_hero_png[1, 0, 5] = "cosh_o2.png";//Akamai
            cos_hero_png[1, 0, 6] = "cosh_o15.png";//拳刃
            cos_hero_png[1, 1, 0] = "cosh_o14.png";//先知
            cos_hero_png[1, 1, 1] = "cosh_o1.png";
            cos_hero_png[1, 1, 2] = "cosh_o13.png";
            cos_hero_png[1, 1, 3] = "cosh_o12.png";
            cos_hero_png[1, 2, 0] = "cosh_o8.png";
            cos_hero_png[1, 2, 1] = "cosh_o9.png";
            cos_hero_png[1, 3, 0] = "cosh_o11.png";
            cos_hero_png[1, 3, 1] = "cosh_o10.png";
            cos_hero_png[1, 3, 2] = "cosh_o16.png";//森金

            cos_hero_length[2, 0] = 2;
            cos_hero_length[2, 1] = 2;
            cos_hero_length[2, 2] = 6;
            cos_hero_length[2, 3] = 1;

            cos_hero_png[2, 0, 0] = "cosh_u7.png";
            cos_hero_png[2, 0, 1] = "cosh_u8.png"; //lichking
            cos_hero_png[2, 0, 2] = "cosh_u6.png"; //
            cos_hero_png[2, 1, 0] = "cosh_u3.png";
            cos_hero_png[2, 1, 1] = "cosh_u4.png";
            cos_hero_png[2, 1, 2] = "cosh_u5.png";
            cos_hero_png[2, 2, 0] = "cosh_u15.png";
            cos_hero_png[2, 2, 1] = "cosh_u14.png";
            cos_hero_png[2, 2, 2] = "cosh_u13.png";
            cos_hero_png[2, 2, 3] = "cosh_u12.png";
            cos_hero_png[2, 2, 4] = "cosh_u11.png";
            cos_hero_png[2, 2, 5] = "cosh_u10.png";
            cos_hero_png[2, 2, 6] = "cosh_u9.png";
            cos_hero_png[2, 3, 0] = "cosh_u1.png";
            cos_hero_png[2, 3, 1] = "cosh_u2.png";

            cos_hero_length[3, 0] = 2;
            cos_hero_length[3, 1] = 2;
            cos_hero_length[3, 2] = 1;
            cos_hero_length[3, 3] = 2;

            cos_hero_png[3, 0, 0] = "cosh_n11.png";
            cos_hero_png[3, 0, 1] = "cosh_n9.png";
            cos_hero_png[3, 0, 2] = "cosh_n8.png";
            cos_hero_png[3, 1, 0] = "cosh_n7.png";
            cos_hero_png[3, 1, 1] = "cosh_n6.png";
            cos_hero_png[3, 1, 2] = "cosh_n5.png";
            cos_hero_png[3, 2, 0] = "cosh_n10.png";
            cos_hero_png[3, 2, 1] = "cosh_n1.png";
            cos_hero_png[3, 3, 0] = "cosh_n3.png";
            cos_hero_png[3, 3, 1] = "cosh_n2.png";
            cos_hero_png[3, 3, 2] = "cosh_n4.png";

            cos_hero_length[4, 0] = 1;
            cos_hero_length[4, 1] = 3;
            cos_hero_length[4, 2] = 1;
            cos_hero_length[4, 3] = 1;
            cos_hero_length[5, 0] = 1;
            cos_hero_length[5, 1] = 1;
            cos_hero_length[5, 2] = 1;
            cos_hero_length[5, 3] = 3;

            cos_hero_png[4, 0, 0] = "cosh_t4.png";
            cos_hero_png[4, 0, 1] = "cosh_t3.png";
            cos_hero_png[4, 1, 0] = "cosh_t13.png";
            cos_hero_png[4, 1, 1] = "cosh_t14.png";
            cos_hero_png[4, 1, 2] = "cosh_t12.png";
            cos_hero_png[4, 1, 3] = "cosh_t11.png";
            cos_hero_png[4, 2, 0] = "cosh_t18.png";
            cos_hero_png[4, 2, 1] = "cosh_t17.png";
            cos_hero_png[4, 3, 0] = "cosh_t10.png";
            cos_hero_png[4, 3, 1] = "cosh_t9.png";
            cos_hero_png[5, 0, 0] = "cosh_t20.png";
            cos_hero_png[5, 0, 1] = "cosh_t19.png";
            cos_hero_png[5, 1, 0] = "cosh_t16.png";
            cos_hero_png[5, 1, 1] = "cosh_t15.png";
            cos_hero_png[5, 2, 0] = "cosh_t2.png";
            cos_hero_png[5, 2, 1] = "cosh_t1.png";
            cos_hero_png[5, 3, 0] = "cosh_t8.png";
            cos_hero_png[5, 3, 1] = "cosh_t6.png";
            cos_hero_png[5, 3, 2] = "cosh_t5.png";
            cos_hero_png[5, 3, 3] = "cosh_t7.png";

            campb[0] = level_1;
            campb[1] = level_1_Copy;
            campb[2] = level_1_Copy1;
            campb[3] = level_1_Copy5;
            campb[4] = level_1_Copy6;
            campb[5] = level_1_Copy7;
            campb[6] = level_1_Copy8;
            campb[7] = level_1_Copy2;
            campb[8] = level_1_Copy9;
            campb[9] = level_1_Copy10;
            campb[10] = level_1_Copy11;
            campb[11] = level_1_Copy12;
            campb[12] = level_1_Copy13;
            campb[13] = level_1_Copy14;
            campb[14] = level_1_Copy3;
            campb[15] = level_1_Copy15;
            campb[16] = level_1_Copy16;
            campb[17] = level_1_Copy17;
            campb[18] = level_1_Copy18;
            campb[19] = level_1_Copy19;
            campb[20] = level_1_Copy20;
            campb[21] = level_1_Copy4;
            campb[22] = level_1_Copy21;
            campb[23] = level_1_Copy22;
            campb[24] = level_1_Copy23;
            campb[25] = level_1_Copy24;
            campb[26] = level_1_Copy25;
            campb[27] = level_1_Copy26;
            campb[28] = level_1_Copy27;
            campb[29] = level_1_Copy28;
            campb[30] = level_1_Copy29;
            campb[31] = level_1_Copy30;
            campb[32] = level_1_Copy31;
            campb[33] = level_1_Copy32;
            campb[34] = level_1_Copy33;


            sevstring[0] = "http://quenching.hiveworkshop.com/quenchingmod-1.zip";
            sevstring[1] = "http://quenching.hiveworkshop.com/quenchingmod-2.zip";
            sevstring[2] = "http://quenching.hiveworkshop.com/quenchingmod-3.zip";
            sevstring[3] = "http://quenching.hiveworkshop.com/quenchingmod-4.zip";
            sevstring[4] = "http://quenching.hiveworkshop.com/quenchingmod-5.zip";
            sevstring[5] = "http://quenching.hiveworkshop.com/quenchingmod-6.zip";
            sevstring[6] = "http://quenching.hiveworkshop.com/quenchingmod-7.zip";
            sevstring[7] = "http://quenching.hiveworkshop.com/quenchingmod-8.zip";
            sevstring[8] = "http://quenching.hiveworkshop.com/quenchingmod-9.zip";
            sevstring[9] = "http://quenching.hiveworkshop.com/quenchingmod-10.zip";
            sevstring[10] = "http://quenching.hiveworkshop.com/quenchingmod-11.zip";
            sevstring[11] = "http://quenching.hiveworkshop.com/quenchingmod-12.zip";
            sevstring[12] = "http://quenching.hiveworkshop.com/quenchingmod-13.zip";
            sevstring[13] = "http://quenching.hiveworkshop.com/quenchingmod-14.zip";
            sevstring[14] = "http://quenching.hiveworkshop.com/quenchingmod-15.zip";
            sevstring[15] = "http://quenching.hiveworkshop.com/quenchingmod-16.zip";
            sevstring[16] = "http://quenching.hiveworkshop.com/quenchingmod-17.zip";
            sevstring[17] = "http://quenching.hiveworkshop.com/quenchingmod-18.zip";
            sevstring[18] = "http://quenching.hiveworkshop.com/quenchingmod-19.zip";
            sevstring[19] = "http://quenching.hiveworkshop.com/quenchingmod-20.zip";
            sevstring[20] = "http://quenching.hiveworkshop.com/quenchingmod-21.zip";
            sevstring[21] = "http://quenching.hiveworkshop.com/quenchingmod-22.zip";
            sevstring[22] = "http://quenching.hiveworkshop.com/quenchingmod-23.zip";
            sevstring[23] = "http://quenching.hiveworkshop.com/quenchingmod-24.zip";
            sevstring[24] = "http://quenching.hiveworkshop.com/quenchingmod-25.zip";
            sevpstring[0] = "http://quenching.hiveworkshop.com/QMPv1.32-1.zip";
            sevpstring[1] = "http://quenching.hiveworkshop.com/QMPv1.32-2.zip";
            sevpstring[2] = "http://quenching.hiveworkshop.com/QMPv1.4.zip";
            sevpstring[3] = "http://quenching.hiveworkshop.com/QMPv1.5.zip";
            sevpstring[4] = "http://quenching.hiveworkshop.com/QMPv1.6.zip";
            sevpstring[5] = "http://quenching.hiveworkshop.com/QMPv1.70-1.zip";
            sevpstring[6] = "http://quenching.hiveworkshop.com/QMPv1.70-2.zip";
            sevpstring[7] = "http://quenching.hiveworkshop.com/QMPv1.70-3.zip";
            sevpstring[8] = "http://quenching.hiveworkshop.com/QMPv1.8.zip";
            sevpstring[8] = "http://quenching.hiveworkshop.com/QMPv1.9.zip";
            sevpstring[9] = "http://quenching.hiveworkshop.com/QMPv2.0.zip";
            sevpstring[10] = "http://quenching.hiveworkshop.com/QMPv2.1.zip";
        }
        public void initstring()
        {
            int i = 0;
            int j = 0;

            string[] temp = new string[2000];




            int tempi = 0;
            j = 0;
            bool readflag = false;
            try
            {
                StreamReader sr = new StreamReader(readtrans);
                string line;
                // 从文件读取并显示行，直到文件的末尾 
                while ((line = sr.ReadLine()) != null)
                {
                    line = line.Replace("\\n", "\n");
                    temp[tempi] = line;
                    tempi++;
                    readflag = true;
                }
                sr.Close();
            }
            catch { }

           


            if (readflag == true)
            {
                dlogstring[0] = temp[j]; j++; //- 提示 -
                dlogstring[1] = temp[j]; j++; //怀旧模式使用经典版的单位模型\n会覆盖所有其他涂装\n适合更加适应经典版画面的玩家

                cosunitstring[2] = temp[j]; j++;
                cosunitstring[3] = temp[j]; j++;
                cosunitstring[4] = temp[j]; j++;
                cosunitstring[5] = temp[j]; j++;
                cosunitstring[6] = temp[j]; j++;
                cosunitstring[7] = temp[j]; j++;
                cosunitstring[8] = temp[j]; j++;
                cosunitstring[9] = temp[j]; j++;
                cosunitstring[0] = temp[j]; j++;
                cosunitstring[1] = temp[j]; j++;

                cosunits1 = cosunitstring[2];
                cosunits2 = cosunitstring[3];

                setstringt[0] = temp[j]; j++;
                setstringc[0] = temp[j]; j++;
                setstringt[1] = temp[j]; j++;
                setstringc[1] = temp[j]; j++;
                setstringt[2] = temp[j]; j++;
                setstringc[2] = temp[j]; j++;
                setstringt[3] = temp[j]; j++;
                setstringc[3] = temp[j]; j++;
                setstringt[4] = temp[j]; j++;
                setstringc[4] = temp[j]; j++;
                setstringt[5] = temp[j]; j++;
                setstringc[5] = temp[j]; j++;
                setstringt[6] = temp[j]; j++;
                setstringc[6] = temp[j]; j++;
                setstringt[7] = temp[j]; j++;
                setstringc[7] = temp[j]; j++;
                setstringt[8] = temp[j]; j++;
                setstringc[8] = temp[j]; j++;
                setstringt[19] = temp[j]; j++;
                setstringc[19] = temp[j]; j++;
                setstringt[9] = temp[j]; j++;
                setstringc[9] = temp[j]; j++;
                setstringt[10] = temp[j]; j++;
                setstringc[10] = temp[j]; j++;
                setstringt[11] = temp[j]; j++;
                setstringc[11] = temp[j]; j++;
                setstringt[12] = temp[j]; j++;
                setstringc[12] = temp[j]; j++;
                setstringt[13] = temp[j]; j++;
                setstringc[13] = temp[j]; j++;
                setstringt[14] = temp[j]; j++;
                setstringc[14] = temp[j]; j++;
                setstringt[15] = temp[j]; j++;
                setstringc[15] = temp[j]; j++;
                setstringt[16] = temp[j]; j++;
                setstringc[16] = temp[j]; j++;
                setstringt[17] = temp[j]; j++;
                setstringc[17] = temp[j]; j++;
                setstringt[18] = temp[j]; j++;
                setstringc[18] = temp[j]; j++;

                achstring1[0] = temp[j]; j++;
                achstring2[0] = temp[j]; j++;
                achstring3[0] = temp[j]; j++;
                achstring4[0] = "a1.png";
                achstring1[1] = temp[j]; j++;
                achstring2[1] = temp[j]; j++;
                achstring3[1] = temp[j]; j++;
                achstring4[1] = "a2.png";
                achstring1[2] = temp[j]; j++;
                achstring2[2] = temp[j]; j++;
                achstring3[2] = temp[j]; j++;
                achstring4[2] = "a3.png";
                achstring1[3] = temp[j]; j++;
                achstring2[3] = temp[j]; j++;
                achstring3[3] = temp[j]; j++;
                achstring4[3] = "a4.png";
                achstring1[4] = temp[j]; j++;
                achstring2[4] = temp[j]; j++;
                achstring3[4] = temp[j]; j++;
                achstring4[4] = "a5.png";
                achstring1[5] = temp[j]; j++;
                achstring2[5] = temp[j]; j++;
                achstring3[5] = temp[j]; j++;
                achstring4[5] = "a6.png";
                achstring1[6] = temp[j]; j++;
                achstring2[6] = temp[j]; j++;
                achstring3[6] = temp[j]; j++;
                achstring4[6] = "a7.png";
                achstring1[7] = temp[j]; j++;
                achstring2[7] = temp[j]; j++;
                achstring3[7] = temp[j]; j++;
                achstring4[7] = "a8.png";
                achstring1[8] = temp[j]; j++;
                achstring2[8] = temp[j]; j++;
                achstring3[8] = temp[j]; j++;
                achstring4[8] = "a9.png";
                achstring1[9] = temp[j]; j++;
                achstring2[9] = temp[j]; j++;
                achstring3[9] = temp[j]; j++;
                achstring4[9] = "a10.png";
                achstring1[10] = temp[j]; j++;
                achstring2[10] = temp[j]; j++;
                achstring3[10] = temp[j]; j++;



                cosherostring[0] = temp[j]; j++;
                cosherostring[1] = temp[j]; j++;
                cosherostring[2] = temp[j]; j++;
                cosherostring[3] = temp[j]; j++;
                cosherostring[4] = temp[j]; j++;
                cosherostring[5] = temp[j]; j++;

                cosheroicon[0] = "p031.png";
                cosheroicon[1] = "p06.png";
                cosheroicon[2] = "p032.png";
                cosheroicon[3] = "p12.png";
                cosheroicon[4] = "p038.png";
                cosheroicon[5] = "p10.png";
                cosheroicon[6] = "p05.png";
                cosheroicon[7] = "p037.png";
                cosheroicon[8] = "p025.png";
                cosheroicon[9] = "p07.png";
                cosheroicon[10] = "p043.png";
                cosheroicon[11] = "p11.png";
                cosheroicon[12] = "p09.png";
                cosheroicon[13] = "p049.png";
                cosheroicon[14] = "p08.png";
                cosheroicon[15] = "p04.png";

                cosheroicon[16] = "p01.png";
                cosheroicon[17] = "p02.png";
                cosheroicon[18] = "p03.png";
                cosheroicon[19] = "p15.png";
                cosheroicon[20] = "p056.png";
                cosheroicon[21] = "p055.png";
                cosheroicon[22] = "p054.png";
                cosheroicon[23] = "p053.png";

                cosheropic[0] = "coslocked.png";
                cosheropic[1] = "coshum1.png";
                cosheropic[2] = "coshum2.png";
                cosheropic[3] = "coshum3.png";
                cosheropic[4] = "coshum4.png";
                cosheropic[5] = "coshum5.png";
                cosheropic[6] = "coshum6.png";
                cosheropic[7] = "coshum7.png";
                cosheropic[8] = "coshum8.png";
                cosheropic[9] = "coshum9.png";
                cosheropic[10] = "coshum10.png";
                cosheropic[11] = "cosorc1.png";
                cosheropic[12] = "cosorc2.png";
                cosheropic[13] = "cosorc3.png";
                cosheropic[14] = "cosorc4.png";
                cosheropic[15] = "cosorc5.png";
                cosheropic[16] = "cosorc6.png";
                cosheropic[17] = "cosorc7.png";
                cosheropic[18] = "cosorc8.png";
                cosheropic[19] = "cosundead1.png";
                cosheropic[20] = "cosundead02.png";
                cosheropic[21] = "cosundead03.png";
                cosheropic[22] = "cosundead04.png";
                cosheropic[23] = "cosundead05.png";
                cosheropic[24] = "cosundead06.png";
                cosheropic[25] = "cosundead07.png";
                cosheropic[26] = "cosundead08.png";
                cosheropic[27] = "cosnightelf01.png";
                cosheropic[28] = "cosnightelf02.png";
                cosheropic[29] = "cosnightelf03.png";
                cosheropic[30] = "cosnightelf04.png";
                cosheropic[31] = "cosnightelf05.png";
                cosheropic[32] = "cosnightelf06.png";
                cosheropic[33] = "cosnightelf07.png";
                cosheropic[34] = "cosnightelf08.png";
                cosheropic[35] = "coscreep00.png";
                cosheropic[36] = "coscreep01.png";
                cosheropic[37] = "coscreep02.png";
                cosheropic[38] = "coscreep03.png";
                cosheropic[39] = "coscreep04.png";
                cosheropic[40] = "coscreep05.png";
                cosheropic[41] = "coscreep06.png";
                cosheropic[42] = "coscreep07.png";
                cosheropic[43] = "coscreep08.png";
                cosheropic[44] = "coscreep09.png";
                cosheropic[45] = "coscreep10.png";
                cosheropic[46] = "coscreep11.png";
                cosheropic[47] = "coscreep12.png";
                cosheropic[48] = "coscreep13.png";

                cosheropic[49] = "coshum29.png";
                cosheropic[50] = "coshum23.png";
                cosheropic[51] = "coshum24.png";
                cosheropic[52] = "cosorc25.png";
                cosheropic[53] = "cosorc26.png";
                cosheropic[54] = "cosundead27.png";
                cosheropic[55] = "coscreep28.png";
                cosheropic[56] = "coscreep30.png";
                cosheropic[57] = "cosnightelf31.png";

                cosheropic[58] = "cosnew38.png";
                cosheropic[59] = "cosnew39.png";
                cosheropic[60] = "cosnew40.png";
                cosheropic[61] = "cosnew41.png";
                cosheropic[62] = "cosnew42.png";
                cosheropic[63] = "cosnew43.png";
                cosheropic[64] = "cosnew44.png";
                cosheropic[65] = "cosnew45.png";
                cosheropic[66] = "cosnew46.png";
                cosheropic[67] = "cosnew47.png";
                cosheropic[68] = "cosnew48.png";
                cosheropic[69] = "cosnew49.png";
                cosheropic[70] = "cosnew50.png";
                cosheropic[71] = "cosnew51.png";
                cosheropic[72] = "cosnew52.png";
                cosheropic[73] = "cosnew53.png";
                cosheropic[74] = "cosnew54.png";
                cosheropic[75] = "cosnew55.png";
                cosheropic[76] = "cosnew56.png";

                cosherodes[0] = temp[j]; j++;
                cosherodes[1] = temp[j]; j++;


                cosherodes[29] = temp[j]; j++;
                cosherodes[30] = temp[j]; j++;
                cosherodes[31] = temp[j]; j++;
                cosherodes[32] = temp[j]; j++;
                cosherodes[33] = temp[j]; j++;
                cosherodes[34] = temp[j]; j++;
                cosherodes[35] = temp[j]; j++;
                cosherodes[36] = temp[j]; j++;
                cosherodes[37] = temp[j]; j++;
                cosherodes[38] = temp[j]; j++;
                cosherodes[39] = temp[j]; j++;
                cosherodes[40] = temp[j]; j++;
                cosherodes[41] = temp[j]; j++;
                cosherodes[42] = temp[j]; j++;
                cosherodes[43] = temp[j]; j++;
                cosherodes[44] = temp[j]; j++;

                cosherodes[2] = temp[j]; j++;
                cosherodes[23] = temp[j]; j++;
                cosherodes[24] = temp[j]; j++;
                cosherodes[3] = temp[j]; j++;
                cosherodes[4] = temp[j]; j++;
                cosherodes[5] = temp[j]; j++;
                cosherodes[25] = temp[j]; j++;
                cosherodes[6] = temp[j]; j++;
                cosherodes[26] = temp[j]; j++;
                cosherodes[7] = temp[j]; j++;
                cosherodes[8] = temp[j]; j++;
                cosherodes[9] = temp[j]; j++;
                cosherodes[10] = temp[j]; j++;
                cosherodes[11] = temp[j]; j++;
                cosherodes[27] = temp[j]; j++;
                cosherodes[12] = temp[j]; j++;
                cosherodes[13] = temp[j]; j++;
                cosherodes[14] = temp[j]; j++;
                cosherodes[15] = temp[j]; j++;
                cosherodes[16] = temp[j]; j++;
                cosherodes[17] = temp[j]; j++;
                cosherodes[18] = temp[j]; j++;
                cosherodes[19] = temp[j]; j++;
                cosherodes[28] = temp[j]; j++;
                cosherodes[20] = temp[j]; j++;
                cosherodes[21] = temp[j]; j++;
                cosherodes[22] = temp[j]; j++;

                mainstring[0] = temp[j]; j++;
                mainstring[1] = temp[j]; j++;
                mainstring[2] = temp[j]; j++;
                mainstring[3] = temp[j]; j++;
                mainstring[4] = temp[j]; j++;
                mainstring[5] = temp[j]; j++;
                mainstring[6] = temp[j]; j++;
                mainstring[7] = temp[j]; j++;
                mainstring[8] = temp[j]; j++;
                mainstring[9] = temp[j]; j++;
                mainstring[10] = temp[j]; j++;
                mainstring[11] = temp[j]; j++;
                mainstring[12] = temp[j]; j++;
                mainstring[13] = temp[j]; j++;
                mainstring[14] = temp[j]; j++;
                mainstring[15] = temp[j]; j++;
                mainstring[16] = temp[j]; j++;
                mainstring[17] = temp[j]; j++;
                mainstring[18] = temp[j]; j++;
                mainstring[19] = temp[j]; j++;
                mainstring[20] = temp[j]; j++;
                mainstring[21] = temp[j]; j++;
                mainstring[22] = temp[j]; j++;
                mainstring[23] = temp[j]; j++;
                mainstring[24] = temp[j]; j++;
                mainstring[25] = temp[j]; j++;
                mainstring[26] = temp[j]; j++;


                mbtext[0] = temp[j]; j++;
                mbtext[1] = temp[j]; j++;
                mbtext[2] = temp[j]; j++;
                mbtext[3] = temp[j]; j++;
                mbtext[4] = temp[j]; j++;
                mbtext[5] = temp[j]; j++;
                mbtext[6] = temp[j]; j++;
                mbtext[7] = temp[j]; j++;
                mbtext[8] = temp[j]; j++;
                mbtext[9] = temp[j]; j++;
                mbtext[10] = temp[j]; j++;
                mbtext[11] = temp[j]; j++;
                mbtext[12] = temp[j]; j++;

                supporttext[0] = temp[j]; j++;
                supporttext[1] = temp[j]; j++;
                supporttext[2] = temp[j]; j++;
                supporttext[3] = temp[j]; j++;
                supporttext[4] = temp[j]; j++;
                supporttext[5] = temp[j]; j++;
                supporttext[6] = temp[j]; j++;

                mbtext[13] = temp[j]; j++;
                mbtext[14] = temp[j]; j++;
                //删除
                mbtext[15] = temp[j]; j++;
                mbtext[16] = temp[j]; j++;
                mbtext[17] = temp[j]; j++;
                mbtext[18] = temp[j]; j++;
                mbtext[19] = temp[j]; j++;
                //读取战役
                mbtext[20] = temp[j]; j++;
                mbtext[21] = temp[j]; j++;
                mbtext[22] = temp[j]; j++;
                //读取语言
                mbtext[23] = temp[j]; j++;
                mbtext[24] = temp[j]; j++;
                //下载地址
                mbtext[25] = temp[j]; j++;
                //皮肤失败
                mbtext[26] = temp[j]; j++;
                //经典版不可用
                mbtext[27] = temp[j]; j++;
                //官网
                mbtext[28] = temp[j]; j++;
                //版本
                mbtext[29] = temp[j]; j++;
                mbtext[30] = temp[j]; j++;
                //升级?
                mbtext[31] = temp[j]; j++;
                //怀旧
                mbtext[32] = temp[j]; j++;
                //自动更新
                mbtext[33] = temp[j]; j++;
                mbtext[34] = temp[j]; j++;
                //选择安装客户端补丁
                mbtext[35] = temp[j]; j++;
                //不可用
                mbtext[36] = temp[j]; j++;
                //先装本体
                mbtext[37] = temp[j]; j++;
                //教程视频
                mbtext[38] = temp[j]; j++;
                //下载地址
                mbtext[39] = temp[j]; j++;
                //反和谐之后
                mbtext[40] = temp[j]; j++;
                //怀旧
                mbtext[41] = temp[j]; j++;
                mbtext[42] = temp[j]; j++;
                //普通
                mbtext[43] = temp[j]; j++;
                mbtext[44] = temp[j]; j++;
                //对战
                mbtext[45] = temp[j]; j++;
                mbtext[46] = temp[j]; j++;
                //别开魔兽
                mbtext[47] = temp[j]; j++;
                //已经安装
                mbtext[48] = temp[j]; j++;
                //涂装切换经典
                mbtext[49] = temp[j]; j++;
                mbtext[50] = temp[j]; j++;
                //重新启动生效
                mbtext[51] = temp[j]; j++;
                //版本太旧
                mbtext[52] = temp[j]; j++;

                cosherodes[45] = temp[j]; j++;
                cosherodes[46] = temp[j]; j++;
                cosherodes[47] = temp[j]; j++;
                cosherodes[48] = temp[j]; j++;
                cosherodes[49] = temp[j]; j++;
                cosherodes[50] = temp[j]; j++;

                cosunitstring[10] = temp[j]; j++;
                cosunitstring[11] = temp[j]; j++;
                cosherodes[51] = temp[j]; j++;
                cosherodes[52] = temp[j]; j++;
                cosherodes[53] = temp[j]; j++;
                cosherodes[54] = temp[j]; j++;
                cosunitstring[12] = temp[j]; j++;
                cosunitstring[13] = temp[j]; j++;

                cosherodes[55] = temp[j]; j++;
                cosherodes[56] = temp[j]; j++;

                cosunitstring[14] = temp[j]; j++;
                cosunitstring[15] = temp[j]; j++;
                cosunitstring[16] = temp[j]; j++;
                cosunitstring[17] = temp[j]; j++;

                cosunitstring[18] = temp[j]; j++;
                cosunitstring[19] = temp[j]; j++;

                //这里开始

                setstringt[19] = temp[252]; j++;
                setstringc[19] = temp[253]; j++;
                setstringt[9] = temp[30]; j++;
                setstringc[9] = temp[31]; j++;

                cos_unit_des[0, 0] = temp[2];
                cos_unit_des[0, 1] = temp[8]; ;
                cos_unit_des[0, 2] = temp[239];
                cos_unit_des[1, 0] = temp[2];
                cos_unit_des[1, 1] = temp[4];
                cos_unit_des[1, 2] = temp[241];
                cos_unit_des[2, 0] = temp[2];
                cos_unit_des[2, 1] = temp[229]; ;
                cos_unit_des[2, 2] = temp[243];
                cos_unit_des[3, 0] = temp[2];
                cos_unit_des[3, 1] = temp[235];

                cos_hero_des[0, 0, 0] = temp[2];
                cos_hero_des[0, 0, 1] = temp[92];
                cos_hero_des[0, 0, 2] = temp[103];
                cos_hero_des[0, 0, 3] = temp[93];
                cos_hero_des[0, 3, 0] = temp[2];
                cos_hero_des[0, 3, 1] = temp[113];
                cos_hero_des[0, 2, 0] = temp[2];
                cos_hero_des[0, 2, 1] = temp[112];
                cos_hero_des[0, 2, 2] = temp[232]; //CSW
                cos_hero_des[0, 1, 0] = temp[2];
                cos_hero_des[0, 1, 1] = temp[109];
                cos_hero_des[0, 1, 2] = temp[110]; //"阿尔萨斯";
                cos_hero_des[0, 1, 3] = temp[120]; //"持剑阿尔萨斯";
                cos_hero_des[0, 1, 4] = temp[111]; //"爵士";
                cos_hero_des[0, 1, 5] = temp[226]; //"灰烬使者";
                cos_hero_des[0, 1, 6] = temp[223]; //"守护者";
                cos_hero_des[0, 1, 7] = temp[224]; //"兽人克星";
                cos_hero_des[0, 1, 8] = temp[111]; //"骑士长";
                cos_hero_des[0, 1, 9] = temp[225]; //"海军上将";
                cos_hero_des[1, 0, 0] = temp[2];
                cos_hero_des[1, 0, 1] = temp[114]; //"萨穆罗";
                cos_hero_des[1, 0, 2] = temp[115]; //"地狱咆哮";
                cos_hero_des[1, 0, 3] = temp[227]; //"着魔地狱咆哮";
                cos_hero_des[1, 0, 4] = temp[228]; //"阿卡玛";
                cos_hero_des[1, 0, 5] = temp[233]; //"拳刃";bagysta
                cos_hero_des[1, 1, 0] = temp[2];
                cos_hero_des[1, 1, 1] = temp[116]; //"萨尔";
                cos_hero_des[1, 1, 2] = temp[117]; //"盲眼先知";
                cos_hero_des[1, 1, 3] = temp[234]; //"古尔丹";
                cos_hero_des[1, 2, 0] = temp[2];
                cos_hero_des[1, 2, 1] = temp[118]; //"血蹄";
                cos_hero_des[1, 3, 0] = temp[2];
                cos_hero_des[1, 3, 1] = temp[119]; //"洛克汗";
                cos_hero_des[1, 3, 2] = temp[245]; //"森金";
                cos_hero_des[2, 0, 0] = temp[2];
                cos_hero_des[2, 0, 1] = temp[247]; //"巫妖王"; Malmgreva
                cos_hero_des[2, 0, 2] = temp[104]; //"恐怖骑士" Vulfar
                cos_hero_des[2, 1, 0] = temp[2];
                cos_hero_des[2, 1, 1] = temp[121]; //"克尔苏加德";//
                cos_hero_des[2, 1, 2] = temp[237]; //"女妖";//
                cos_hero_des[2, 2, 0] = temp[2];
                cos_hero_des[2, 2, 1] = temp[123]; //"提克迪奥斯 ";
                cos_hero_des[2, 2, 2] = temp[122]; //"迪瑟洛克";
                cos_hero_des[2, 2, 3] = temp[105]; //"瓦里玛萨斯";
                cos_hero_des[2, 2, 4] = temp[249]; //"巴纳扎尔";
                cos_hero_des[2, 2, 5] = temp[250]; //"达文格尔";
                cos_hero_des[2, 2, 6] = temp[251]; //"麦尔盖尼斯";
                cos_hero_des[2, 3, 0] = temp[2];
                cos_hero_des[2, 3, 1] = temp[124]; //"阿努巴拉克";
                cos_hero_des[3, 0, 0] = temp[2];
                cos_hero_des[3, 0, 1] = temp[126]; //"泰兰德";
                cos_hero_des[3, 0, 2] = temp[106]; //"步行泰兰德";
                cos_hero_des[3, 1, 0] = temp[2];
                cos_hero_des[3, 1, 1] = temp[101]; // "塞纳留斯";
                cos_hero_des[3, 1, 2] = temp[125]; //"玛法里奥";
                cos_hero_des[3, 2, 0] = temp[2];
                cos_hero_des[3, 2, 1] = temp[127]; //"伊利丹";
                cos_hero_des[3, 3, 0] = temp[2];
                cos_hero_des[3, 3, 1] = temp[128]; //"玛维";
                cos_hero_des[3, 3, 2] = temp[248]; //"暗夜孤星";
                cos_hero_des[4, 0, 0] = temp[2];
                cos_hero_des[4, 0, 1] = temp[133]; //"兽王";
                cos_hero_des[4, 1, 0] = temp[2];
                cos_hero_des[4, 1, 1] = temp[135]; //"希尔瓦娜斯";
                cos_hero_des[4, 1, 2] = temp[108]; //"精灵将军";
                cos_hero_des[4, 1, 3] = temp[238]; //"光明游侠";
                cos_hero_des[4, 2, 0] = temp[2];
                cos_hero_des[4, 2, 1] = temp[129]; //"瓦斯琪";
                cos_hero_des[4, 3, 0] = temp[2];
                cos_hero_des[4, 3, 1] = temp[107]; //"原型食人魔";
                cos_hero_des[5, 0, 0] = temp[2];
                cos_hero_des[5, 0, 1] = temp[134]; //"烈酒风暴";
                cos_hero_des[5, 1, 0] = temp[2];
                cos_hero_des[5, 1, 1] = temp[231]; //"上古之神";
                cos_hero_des[5, 2, 0] = temp[2];
                cos_hero_des[5, 2, 1] = temp[130]; //"工程师";
                cos_hero_des[5, 3, 0] = temp[2];
                cos_hero_des[5, 3, 1] = temp[100]; //"玛瑟里顿";
                cos_hero_des[5, 3, 2] = temp[131]; // "阿兹加洛";
                cos_hero_des[5, 3, 3] = temp[132]; //"玛诺洛斯";
                //cosherodes[57] = temp[j]; j++;
            }
            else
            {

            }
        }
        string GetHash(string path)
        {
            //var hash = SHA256.Create();
            var hash = MD5.Create();
            //var hash = SHA1.Create();
            if (File.Exists(path))
            {
                var stream = new FileStream(path, FileMode.Open);
                byte[] hashByte = hash.ComputeHash(stream);
                stream.Close();
                return BitConverter.ToString(hashByte).Replace("-", "");
            }
            else { return "none"; }

        }

        public void entersound(object sender, RoutedEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
        }

        public int copyf(string sourceFolder, string destFolder)
        {
            try
            {
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string destfolderdir = System.IO.Path.Combine(destFolder, folderName);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                System.IO.Directory.CreateDirectory(destfolderdir);
                foreach (string file in filenames)// 遍历所有的文件和目录
                {
                    if (System.IO.Directory.Exists(file))
                    {
                        string currentdir = System.IO.Path.Combine(destfolderdir, System.IO.Path.GetFileName(file));
                        if (!System.IO.Directory.Exists(currentdir))
                        {
                            System.IO.Directory.CreateDirectory(currentdir);
                        }
                        copyf(file, destfolderdir);
                    }
                    else
                    {
                        string srcfileName = System.IO.Path.Combine(destfolderdir, System.IO.Path.GetFileName(file));
                        if (!System.IO.Directory.Exists(destfolderdir))
                        {
                            System.IO.Directory.CreateDirectory(destfolderdir);
                        }
                        if (file.Contains("-quenching0")) { qjoin(file.Replace("-quenching0", ""), srcfileName.Replace("-quenching0", "")); }
                        else if (!file.Contains("-quenching"))
                        { System.IO.File.Copy(file, srcfileName, true); }
                    }
                }

                return 1;
            }
            catch (Exception e)
            {
                //MessageBox.Show();
                return 0;
            }
        }

        public int copyfpb(string sourceFolder, string destFolder)
        {
            try
            {
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string destfolderdir = System.IO.Path.Combine(destFolder, folderName);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                System.IO.Directory.CreateDirectory(destfolderdir);
                foreach (string file in filenames)// 遍历所有的文件和目录
                {
                    if (System.IO.Directory.Exists(file))
                    {
                        string currentdir = System.IO.Path.Combine(destfolderdir, System.IO.Path.GetFileName(file));
                        if (!System.IO.Directory.Exists(currentdir))
                        {
                            System.IO.Directory.CreateDirectory(currentdir);
                        }
                        copyfpb(file, destfolderdir);
                    }
                    else
                    {
                        string srcfileName = System.IO.Path.Combine(destfolderdir, System.IO.Path.GetFileName(file));
                        if (!System.IO.Directory.Exists(destfolderdir))
                        {
                            System.IO.Directory.CreateDirectory(destfolderdir);
                        }
                        if (file.Contains("-quenching0")) { qjoin(file.Replace("-quenching0", ""), srcfileName.Replace("-quenching0", "")); }
                        else if (!file.Contains("-quenching"))
                        { File.Copy(file, srcfileName, true); }
                        this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + srcfileName; });
                    }
                }

                return 1;
            }
            catch (Exception e)
            {
                //MessageBox.Show();
                return 0;
            }
        }

        private bool CopyFile(string srcFile, string destDir)
        {
            try
            {
                DirectoryInfo info = new DirectoryInfo(System.IO.Path.GetDirectoryName(destDir));
                string fileName = System.IO.Path.GetFileName(srcFile);
                if (File.Exists(srcFile))
                {
                    if (!info.Exists)
                    {
                        info.Create();
                    }
                    File.Copy(srcFile, info.FullName + @"\" + fileName, true);
                }
                return true;
            }
            catch
            { return false; }
        }

        private bool DownloadFile(string URL, string filename)
        {
            //if (URL.Contains("aliyun"))
            //{
            //    URL = URL.Replace("mod/", "mod/raw/master/");
            //    URL = URL.Replace("vio/", "vio/raw/master/");
            //    URL = URL.Replace("ali/", "ali/raw/master/");
            //}
            try
            {
                HttpWebRequest Myrq = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(URL);
                HttpWebResponse myrp = (System.Net.HttpWebResponse)Myrq.GetResponse();
                string tempname = System.IO.Path.GetFileName(URL);
                Console.WriteLine(URL);
                Stream st = myrp.GetResponseStream();
                string tempstring = filename;
                if (Directory.Exists(System.IO.Path.GetDirectoryName(tempstring)) == false)
                {
                    Directory.CreateDirectory(System.IO.Path.GetDirectoryName(tempstring));
                }
                Stream so = new System.IO.FileStream(filename, System.IO.FileMode.Create);
                byte[] by = new byte[1024];
                int osize = st.Read(by, 0, (int)by.Length);
                while (osize > 0)
                {
                    so.Write(by, 0, osize);
                    osize = st.Read(by, 0, (int)by.Length);
                }
                so.Close();
                st.Close();
                myrp.Close();
                Myrq.Abort();
                return true;
            }
            catch (System.Exception e)
            {
                return false;
            }
        }
        private bool DownloadFilewpb(string URL, string filename)
        {
            //if (URL.Contains("aliyun"))
            //{
            //    URL = URL.Replace("mod/", "mod/raw/master/");
            //    URL = URL.Replace("vio/", "vio/raw/master/");
            //    URL = URL.Replace("ali/", "ali/raw/master/");
            //}
            try
            {
                HttpWebRequest Myrq = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(URL);
                HttpWebResponse myrp = (System.Net.HttpWebResponse)Myrq.GetResponse();
                string tempname = System.IO.Path.GetFileName(URL);
                Console.WriteLine(URL);
                Stream st = myrp.GetResponseStream();
                string tempstring = filename;
                if (Directory.Exists(System.IO.Path.GetDirectoryName(tempstring)) == false)
                {
                    Directory.CreateDirectory(System.IO.Path.GetDirectoryName(tempstring));
                }
                Stream so = new System.IO.FileStream(filename, System.IO.FileMode.Create);
                byte[] by = new byte[1024];
                int osize = st.Read(by, 0, (int)by.Length);
                while (osize > 0)
                {

                    so.Write(by, 0, osize);
                    osize = st.Read(by, 0, (int)by.Length);
                }
                so.Close();
                st.Close();
                myrp.Close();
                Myrq.Abort();
                return true;
            }
            catch (System.Exception e)
            {
                return false;
            }
        }

        private bool DownloadLZFile(string URL, string filename, string lz)
        {
            //if (URL.Contains("aliyun"))
            //{
            //    URL = URL.Replace("mod/", "mod/raw/master/");
            //    URL = URL.Replace("vio/", "vio/raw/master/");
            //    URL = URL.Replace("ali/", "ali/raw/master/");
            //}
            try
            {
                HttpWebRequest Myrq = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(URL);
                Myrq.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36";
                Myrq.Headers["Accept-Language"] = "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2";
                Myrq.Referer = lz;

                HttpWebResponse myrp = (System.Net.HttpWebResponse)Myrq.GetResponse();
                string tempname = System.IO.Path.GetFileName(URL);
                Console.WriteLine(URL);
                Stream st = myrp.GetResponseStream();
                string tempstring = filename;
                if (Directory.Exists(System.IO.Path.GetDirectoryName(tempstring)) == false)
                {
                    Directory.CreateDirectory(System.IO.Path.GetDirectoryName(tempstring));
                }
                Stream so = new System.IO.FileStream(filename, System.IO.FileMode.Create);
                byte[] by = new byte[1024];
                int osize = st.Read(by, 0, (int)by.Length);
                while (osize > 0)
                {
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = pbp.Value + 1; });
                    so.Write(by, 0, osize);
                    osize = st.Read(by, 0, (int)by.Length);
                }
                so.Close();
                st.Close();
                myrp.Close();
                Myrq.Abort();
                return true;
            }
            catch (System.Exception e)
            {
                return false;
            }
        }

        public void btnclickT(Button b)
        {
            b.Background = (Brush)new BrushConverter().ConvertFrom("#FFFFDE00");
            b.Foreground = (Brush)new BrushConverter().ConvertFrom("#FF2C2C2C");
        }
        public void btnclickB(Button b)
        {
            b.Background = (Brush)new BrushConverter().ConvertFrom("#A86F6F6F");
            b.Foreground = (Brush)new BrushConverter().ConvertFrom("#A8FFFFFF");
        }
        public void btnclickF(Button b)
        {
            b.Background = (Brush)new BrushConverter().ConvertFrom("#00000000");
            b.Foreground = (Brush)new BrushConverter().ConvertFrom("#FFC9C9C9");
        }
        public string getonelineque(string path)
        {
            StreamReader sr = new StreamReader(path, Encoding.Default);
            string temp = sr.ReadLine();
            sr.Close();
            return temp;
        }
        public void reg()
        {
            RegistryKey lm = Registry.CurrentUser;
            if (lm.OpenSubKey("SOFTWARE\\Blizzard Entertainment\\Warcraft III\\", true) == null)
            { lm.CreateSubKey("SOFTWARE\\Blizzard Entertainment\\Warcraft III\\", true); }
            else
            {
                RegistryKey software = lm.OpenSubKey("SOFTWARE\\Blizzard Entertainment\\Warcraft III\\", true);
                software.SetValue("Quenching", "1.1");
                software.SetValue("Allow Local Files", "1", RegistryValueKind.DWord);
            }
            //lm.DeleteSubKey("SOFTWARE\\Blizzard Entertainment\\Warcraft III\\WorldEdit");
            lm.Close();
        }
        public void viofile(string sourceFolder)
        {
            try
            {
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                foreach (string file in filenames)
                {
                    if (System.IO.Directory.Exists(file)) { viofile(file); }
                    else
                    {
                        if (!file.Contains(".git") && !file.Contains(".ssh"))
                        {
                            if (!file.Contains("-vio"))
                            { filemove(file, file + "-vio"); }
                        }
                    }
                }
            }
            catch { }

        }
        public int downloadline = 0;
        public int filecodenow = 1;
        public int downloadversion = 1;
        public int downloadmax = 23;
        //public int[] filecheck = { 50000000, 70000000, 80000000, 90000000, 90000000, 90000000, 90000000, 90000000, 90000000, 90000000, 90000000, 90000000, 90000000, 15000000 };
        private void maincheckfile()
        {
            try
            {
                string tempstring = "";
                Console.WriteLine("into download");
                //重下最新版还是补丁 filecode 指大版本上有差距 所以没办继续下了 目前一直应该是 1
                //bool b = DownloadFile(fseverurl + "filecode.que", "./quenching/filecode.que");
                //if (b)
                //{ if (Convert.ToInt32(getonelineque("./quenching/filecode.que")) > filecodenow) { MessageBox.Show(mbtext[34]); return; } }
                //else { MessageBox.Show(mainstring[2]); return; }
                //补丁还是全下
                if (downloadversion == 1) { tempstring = "filelist.que"; }
                //if (downloadversion == 2)
                //{
                //   tempstring = "filelistpatch.que";
                //  if (!File.Exists(dir_root + "patch/keep.que"))
                // { MessageBox.Show(mbtext[37]); return; }
                //}
                //拿文件序列
                bool a = DownloadFile(fseverurl + tempstring, "./quenching/" + tempstring);
                //bool b = DownloadFile(severurl + "mod/hash.que", "./quenching/hash.que");
                //Console.WriteLine("aaa");
                //逐一下载                string[] vk = File.ReadAllLines("./quenching/versionkeep.que");
                if (a)
                {
                    string[] line = File.ReadAllLines("./quenching/" + tempstring);
                    //Console.WriteLine("aaa");
                    //处理下载列表
                    //String line;
                    //MessageBox.Show("haha");
                    //nr.Close();
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; });
                    //StreamReader sr = new StreamReader("./quenching/" + tempstring, Encoding.Default);
                    //nr = new StreamReader("./quenching/hash.que", Encoding.Default);
                    //开始下载
                    int tempi = 0;
                    System.IO.FileInfo f;
                    if (downloadline == 0)
                    {
                        Console.WriteLine("into line1");
                        for (int i = 0; i < downloadmax; i++)
                        {
                            tempi = tempi + 1;
                            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = 100000; pbp.Value = 0; pbtext1.Text = mainstring[6] + "QMmod.part" + tempi; });
                            //蓝奏云
                            if (File.Exists("./quenching/temp/patch-" + tempi + ".zip"))
                            {
                                f = new FileInfo("./quenching/temp/patch-" + tempi + ".zip");
                                if (f.Length < 50000000) { try { File.Delete("./quenching/temp/patch-" + tempi + ".zip"); } catch { } }
                            }
                            if (!File.Exists("./quenching/temp/patch-" + tempi + ".zip"))
                            {
                                Console.WriteLine(line[i * 2]);
                                if (!DownloadLZFile(line[i * 2], "./quenching/temp/patch-" + tempi + ".temp", line[i * 2 + 1]))
                                {
                                    //放弃
                                    try { File.Delete("./quenching/temp/patch-" + tempi + ".temp"); } catch { }
                                    MessageBox.Show(mainstring[2]);
                                    this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });

                                    return;
                                }
                                else
                                {
                                    File.Copy("./quenching/temp/patch-" + tempi + ".temp", "./quenching/temp/patch-" + tempi + ".zip", true);
                                    File.Delete("./quenching/temp/patch-" + tempi + ".temp");

                                }
                            }
                            else
                            { }
                        }
                    }
                    else //Hive
                    {
                        //try { File.Delete("./quenching/temp/patch.zip"); } catch { }
                        for (int i = 0; i < downloadmax; i++)
                        {
                            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = 100000; pbp.Value = 0; pbtext1.Text = mainstring[6] + "QMmod.part" + tempi; });
                            if (!File.Exists("./quenching/temp/patch-" + tempi + ".zip"))
                            {
                                if (!DownloadFilewpb(sevstring[i], "./quenching/temp/patch-" + tempi + ".temp"))
                                {
                                    try { File.Delete("./quenching/temp/patch-" + tempi + ".temp"); } catch { }
                                    MessageBox.Show(mainstring[2]);
                                    this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });
                                    //sr.Close();
                                    return;
                                }
                                else
                                {
                                    File.Copy("./quenching/temp/patch-" + tempi + ".temp", "./quenching/temp/patch-" + tempi + ".zip", true);
                                    File.Delete("./quenching/temp/patch-" + tempi + ".temp"); }
                            }
                        }
                    }
                    //MessageBox.Show("haha");
                    //MessageBox.Show("校对结果:" + tempflag.ToString() + "个文件需要更新");//
                    //下完了然后拼装,解压,完事

                    this.Dispatcher.Invoke(() =>
                    {
                        pb.Visibility = Visibility.Hidden; pbp.Value = 0;
                        maincheckt.Text = mainstring[5] + System.Environment.NewLine + getonelineque("./quenching/version.que");
                    });
                    tempstring = "";
                    //sr.Close();
                    //开始解压
                    for (int i = 1; i <= downloadmax; i++)
                    {

                        //全都全装算了..
                        quezipfile = "./quenching/temp/patch-" + i + ".zip";
                        zipmaxint = 300;
                        unZipFileLZD();
                    }
                    //MessageBox.Show("haha");
                    //string strAppFileName = Process.GetCurrentProcess().MainModule.FileName;
                    //Process myNewProcess = new Process();
                    //myNewProcess.StartInfo.FileName = strAppFileName;
                    //myNewProcess.StartInfo.WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory;
                    //myNewProcess.Start();
                    //this.Dispatcher.Invoke(() => { Close(); });
                    return;
                    //nr.Close();
                }

            }
            catch (Exception e) { }//MessageBox.Show();
        }
        /*private void maincheckfile()
        {
            if (GetIniInt("mod", "lang", 0) == 0) { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/"); }
            else { System.Diagnostics.Process.Start("https://quenching.hiveworkshop.com/"); }
        }*/
        public int initnum;
        // MessageBox.Show();
        public void filemove(string s, string d)
        {
            try { File.Move(s, d); } catch { }
        }
        public void dirmove(string s, string d)
        {
            try { Directory.Move(s, d); } catch { }
        }

        string ver = "v2.3";
        string cver = "v2.3";
        string clientver = "v2.3";
        string clientvertemp = "v2.3";

        public void checkupdate()
        {
            if (DownloadFile(fseverurl + "versionclient.que", "./quenching/versionclient.que"))
            {
                clientver = getonelineque("./quenching/versionclient.que");
                if (clientver != clientvertemp)
                {
                    if (System.Windows.MessageBox.Show(mbtext[31], "", MessageBoxButton.YesNo, MessageBoxImage.Question, MessageBoxResult.Yes) == MessageBoxResult.Yes)
                    {
                        try { System.Diagnostics.Process.Start(mbtext[28]); }
                        catch
                        {
                            if (GetIniInt("mod", "lang", 0) == 0) { System.Diagnostics.Process.Start("https://www.bilibili.com/video/BV1D8411G7Ui/"); }
                            else { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/QMdownloadEN.html"); }
                        }
                        //Environment.Exit(0);
                    }
                }
            }
            //客户端更新标识
            try
            {
                //基础更新标识
                //文件更新标识
                if (DownloadFile(fseverurl + "versionkeep.que", "./quenching/versionkeep.que"))
                {

                    if (File.Exists(dir_root + "patch/keep.que"))
                    {
                        string[] vk = File.ReadAllLines("./quenching/versionkeep.que");
                        string[] lk = File.ReadAllLines(dir_root + "patch/keep.que");
                        for (int i = 0; i < vk.Length; i++)
                        {

                            try
                            {
                                if (vk[i] != lk[i])
                                {
                                    if (System.Windows.Forms.MessageBox.Show(mbtext[33], "", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
                                    {
                                        //Console.WriteLine("aaa");
                                        downloadversion = 1;
                                        //lockhd
                                        hdbool = 1;
                                        fileloadflag = 3;
                                        Thread thread1 = new Thread(new ThreadStart(filetemplate));
                                        thread1.Start();
                                        hdlock = true;
                                        if (GetIniInt("mod", "lockh", 0) == 1) { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_min_Copy4); }); hdlock = true; }
                                        if (GetIniInt("mod", "lockc", 0) == 1) { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_min_Copy3); }); sdlock = true; }
                                        //
                                        Thread thread = new Thread(new ThreadStart(maincheckfile));
                                        thread.Start(); return;
                                    }
                                }
                            }
                            catch
                            {
                                if (System.Windows.Forms.MessageBox.Show(mbtext[33], "", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
                                {
                                    downloadversion = 1;
                                    //lockhd
                                    hdbool = 1;
                                    fileloadflag = 3;
                                    Thread thread1 = new Thread(new ThreadStart(filetemplate));
                                    thread1.Start();
                                    hdlock = true;
                                    if (GetIniInt("mod", "lockh", 0) == 1) { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_min_Copy4); }); hdlock = true; }
                                    if (GetIniInt("mod", "lockc", 0) == 1) { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_min_Copy3); }); sdlock = true; }
                                    //
                                    Thread thread = new Thread(new ThreadStart(maincheckfile));
                                    thread.Start(); return;
                                }
                            }

                        }
                        MessageBox.Show(mainstring[5]);
                        return;
                    }
                    else
                    {
                        if (System.Windows.Forms.MessageBox.Show(mbtext[33], "", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
                        {
                            downloadversion = 1;
                            Thread thread = new Thread(new ThreadStart(maincheckfile));
                            thread.Start(); return;
                        }
                    }
                }
            }
            catch
            {
                this.Dispatcher.Invoke(() =>
                { maincheckt.Text = mainstring[2] + System.Environment.NewLine + ver; });
            }

            //检测retail里面有没有装，然后给出文字提示

            //update setting tool
            /*
             try
            {
                if (GetIniInt("mod", "mode", 0) == 1) { this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[16] + System.Environment.NewLine + getonelineque("./quenching/version.que"); }); }
                else
                {
                    if (!File.Exists(dir_root + "webui/QuenchingOn.png"))
                    {

                        this.Dispatcher.Invoke(() =>
                        {
                            maincheckt.Text = mainstring[21] + System.Environment.NewLine + ver;
                        });
                        Thread thread = new Thread(new ThreadStart(initmod));
                        thread.Start();
                    }

                }
            }
            catch { }
            if (DownloadFile(severurl + "mod/versionclient.que", "./quenching/versionclient.que"))
            {
                cver = getonelineque("./quenching/versionclient.que");
            }
            if (cver != "v1.11")
            {
                this.Dispatcher.Invoke(() =>
                {
                    maincheckt.Text = mainstring[23] + System.Environment.NewLine + ver;
                });
                //System.Diagnostics.Process.Start("QuenchingUpdateTool.exe");
                //Close();
            }

        }
        catch { }
                        Console.WriteLine(Assembly.GetExecutingAssembly().GetName().Name);
            IntPtr parenthWnd = FindWindow(null, "QuenchingModCN");
            if (parenthWnd != IntPtr.Zero)
            {
               
                SetForegroundWindow(parenthWnd);
                Environment.Exit(0);
            }
             */

        }
        public bool joinflag = false;
        public int splitfile(string sourceFolder)
        {
            try
            {
                string temp;
                // 从文件中读取并显示每行
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                foreach (string file in filenames)// 遍历所有的文件和目录
                {
                    if (System.IO.Directory.Exists(file))
                    {
                        splitfile(file);
                    }
                    else
                    {
                        if (!file.Contains(".git") && !file.Contains(".ssh"))
                        {
                            FileInfo tempinfo = new FileInfo(file);
                            //Console.WriteLine(tempinfo.Length);
                            if (file.Contains("-quenching0") && !file.Contains("-vio"))
                            {
                                qjoin(file.Replace("-quenching0", ""), file.Replace("-quenching0", ""));
                                if (joinflag == false)
                                {
                                    joinflag = true;
                                    MessageBox.Show(mbtext[1], mbtext[0]);
                                }

                            }
                        }
                    }

                    Console.WriteLine(file);
                }

                return 1;
            }
            catch (Exception e)
            {

                //MessageBox.Show();
                return 0;
            }

        }

        public int countfile1(string sourceFolder)
        {
            try
            {

                // 从文件中读取并显示每行
                string folderName = System.IO.Path.GetFileName(sourceFolder);
                string[] filenames = System.IO.Directory.GetFileSystemEntries(sourceFolder);
                foreach (string file in filenames)// 遍历所有的文件和目录
                {
                    if (System.IO.Directory.Exists(file))
                    {
                        countfile1(file);
                    }
                    else
                    {
                        if (!file.Contains(".git") && !file.Contains(".ssh"))
                        {
                            if (file.Contains("-quenching"))
                            {
                                try { File.Delete(file); } catch { }
                            }
                            else
                            {

                            }
                        }
                    }
                }
                return 1;
            }
            catch (Exception e)
            {
                return 0;
            }

        }
        static int FindStrPos(byte[] b, string s)
        {
            int i = 0;
            for (int j = 0; j < 100000; j++)
            {
                //Console.WriteLine(BitConverter.ToString(b, j, 4));
                if (BitConverter.ToString(b, j, (s.Length + 1) / 3) == s)//"3E-00-00-01"
                { return j + (s.Length + 1) / 3; }
            }
            return i;
        }



        public static string BytesTohexString(byte[] bytes)
        {
            if (bytes == null || bytes.Count() < 1)
            {
                return string.Empty;
            }

            var count = bytes.Count();

            var cache = new StringBuilder();
            cache.Append("0x");
            for (int ii = 0; ii < count; ++ii)
            {
                var tempHex = Convert.ToString(bytes[ii], 16).ToUpper();
                cache.Append(tempHex.Length == 1 ? "0" + tempHex : tempHex);
            }

            return cache.ToString();
        }

        public void streamwuni(string origin, string dest)
        {
            Stream readStream = Application.GetResourceStream(new Uri("pack://application:,,,/" + origin)).Stream;
            Stream writeStream = File.OpenWrite(dest);
            byte[] data = new byte[1024];//用来存放读取流中读取到的数据
            while (true)//因为FileStream的Read方法在读取的数据超过存放的count长度的时候是分多次读取，所以我们用一个死循环
            {
                int length = readStream.Read(data, 0, data.Length);//data是存放的字节数组，0是从字节数组的哪个位置开始存放，data.Length是可存放的容量大小，返回值length是实际存放的大小
                if (length == 0)//当FileStream的Read方法读取到文件尾部的时候，会返回0
                {
                    Console.WriteLine("写入结束");
                    break;
                }
                else
                {
                    writeStream.Write(data, 0, length);//将数据流写入，data是写入的字节数组，0是从字节数组哪个位置开始写入，length是写入的长度
                }
            }
            writeStream.Close();//关闭文件流
            readStream.Close();//关闭文件流
        }
        public string getnumber1(string index)
        {
            int tempflag = 0;
            int tempi1 = 0;
            int tempi2 = 0;
            for (int i = 0; i < index.Length; i++)
            {
                if (index.Substring(i, 1) == nullexample)
                {
                    if (tempflag == 0)
                    { tempflag++; tempi1 = i; }
                    else
                    { tempi2 = i; }

                }
            }
            string temp1 = index.Substring(0, tempi1);
            string temp2 = System.Text.RegularExpressions.Regex.Replace(temp1, @"[^0-9]+", "");
            temp1 = temp2;
            if (temp2.Substring(0, 1) == "0")
            { temp1 = temp2.Substring(1, temp2.Length - 1); }
            if (temp2.Substring(0, 1) == "0" && temp2.Substring(1, 1) == "0")
            {
                temp1 = temp2.Substring(2, temp2.Length - 2);
            }


            Console.WriteLine(temp1);
            return temp1;
        }
        public string getnumber2(string index)
        {
            try
            {
                int tempflag = 0;
                int tempi1 = 0;
                int tempi2 = 0;
                for (int i = 0; i < index.Length; i++)
                {
                    if (index.Substring(i, 1) == nullexample)
                    {
                        if (tempflag == 0)
                        { tempflag++; tempi1 = i; }
                        else
                        { tempi2 = i; }

                    }
                }
                string temp1 = index.Substring(tempi1, tempi2 - tempi1);
                string temp2 = System.Text.RegularExpressions.Regex.Replace(temp1, @"[^0-9]+", "");
                temp1 = temp2;
                if (temp2.Substring(0, 1) == "0")
                { temp1 = temp2.Substring(1, temp2.Length - 1); }
                if (temp2.Substring(0, 1) == "0" && temp2.Substring(1, 1) == "0")
                {
                    temp1 = temp2.Substring(2, temp2.Length - 2);
                }



                Console.WriteLine(temp1);
                return temp1;
            }
            catch
            { return ""; }

        }
        string nullexample = "";
        public string getwts(string index)
        {
            try
            {
                string[] tempwts = File.ReadAllLines(".\\quenching\\temp\\camp\\war3campaign.wts");
                for (int i = 0; i < tempwts.Length; i++)
                {
                    if (tempwts[i].Contains(index))
                    {
                        Console.WriteLine(tempwts[i + 2]);
                        return tempwts[i + 2];
                    }

                }
                return index;
            }
            catch
            { return ""; }

        }

        public void initDNC()
        {
            DNCfile[0] = dir_root + "environment/dnc/dnclordaeron/dnclordaeronterrain/dnclordaeronterrain.mdl";
            DNCfile[1] = dir_root + "environment/dnc/dnclordaeron/dnclordaeronunit/dnclordaeronunit.mdl";
            DNCfile[2] = dir_root + "environment/dnc/dncashenvale/dncashenvaleunit/dncashenvaleunit.mdl";
            DNCfile[3] = dir_root + "environment/dnc/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl";
            DNCfile[4] = dir_root + "environment/dnc/dncdalaran/dncdalaranterrain/dncdalaranterrain.mdl";
            DNCfile[5] = dir_root + "environment/dnc/dncdalaran/dncdalaranunit/dncdalaranunit.mdl";
            DNCfile[6] = dir_root + "environment/dnc/dncfelwood/dncfelwoodterrain/dncfelwoodterrain.mdl";
            DNCfile[7] = dir_root + "environment/dnc/dncfelwood/dncfelwoodunit/dncfelwoodunit.mdl";

            DNCfile[8] = dir_root + "environment/dnc45/dnclordaeron/dnclordaeronterrain/dnclordaeronterrain.mdl";
            DNCfile[9] = dir_root + "environment/dnc45/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl";
            DNCfile[10] = dir_root + "environment/dnc45/dncdalaran/dncdalaranterrain/dncdalaranterrain.mdl";
            DNCfile[11] = dir_root + "environment/dnc45/dncfelwood/dncfelwoodterrain/dncfelwoodterrain.mdl";

            DNCfile[12] = dir_root + "environment/dnc45/dncfelwood/dncfelwoodunit/dncfelwoodunit.mdl";
            DNCfile[13] = dir_root + "environment/dnc45/dnclordaeron/dnclordaeronunit/dnclordaeronunit.mdl";
            DNCfile[14] = dir_root + "environment/dnc45/dncashenvale/dncashenvaleunit/dncashenvaleunit.mdl";
            DNCfile[15] = dir_root + "environment/dnc45/dncdalaran/dncdalaranunit/dncdalaranunit.mdl";

            DNCfile[16] = dir_root + "environment/dncspin/dnclordaeron/dnclordaeronterrain/dnclordaeronterrain.mdl";
            DNCfile[17] = dir_root + "environment/dncspin/dncdalaran/dncdalaranterrain/dncdalaranterrain.mdl";
            DNCfile[18] = dir_root + "environment/dncspin/dncfelwood/dncfelwoodterrain/dncfelwoodterrain.mdl";
            DNCfile[19] = dir_root + "environment/dncspin/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl";

            DNCfile[20] = dir_root + "environment/dncspin/dnclordaeron/dnclordaeronunit/dnclordaeronunit.mdl";
            DNCfile[21] = dir_root + "environment/dncspin/dncdalaran/dncdalaranunit/dncdalaranunit.mdl";
            DNCfile[22] = dir_root + "environment/dncspin/dncashenvale/dncashenvaleunit/dncashenvaleunit.mdl";
            DNCfile[23] = dir_root + "environment/dncspin/dncfelwood/dncfelwoodunit/dncfelwoodunit.mdl";

            DNCfile[24] = dir_root + "environment/dnc45/dncdungeon/dncdungeonterrain/dncdungeonterrain.mdl";
            DNCfile[25] = dir_root + "environment/dnc45/dncdungeon/dncdungeonunit/dncdungeonunit.mdl";

            DNCfile[26] = dir_root + "environment/dnc/dncdungeon/dncdungeonterrain/dncdungeonterrain.mdl";
            DNCfile[27] = dir_root + "environment/dnc/dncdungeon/dncdungeonunit/dncdungeonunit.mdl";

            DNCfile[28] = dir_root + "environment/dnc45/dncunderground/dncundergroundterrain/dncundergroundterrain.mdl";
            DNCfile[29] = dir_root + "environment/dnc45/dncunderground/dncundergroundunit/dncundergroundunit.mdl";
            DNCfile[30] = dir_root + "environment/dnc/dncunderground/dncundergroundterrain/dncundergroundterrain.mdl";
            DNCfile[31] = dir_root + "environment/dnc/dncunderground/dncundergroundunit/dncundergroundunit.mdl";

            DNCfile[32] = dir_root + "environment/dncspin/dncunderground/dncundergroundterrain/dncundergroundterrain.mdl";
            DNCfile[33] = dir_root + "environment/dncspin/dncunderground/dncundergroundunit/dncundergroundunit.mdl";
            DNCfile[34] = dir_root + "environment/dncspin/dncdungeon/dncdungeonterrain/dncdungeonterrain.mdl";
            DNCfile[35] = dir_root + "environment/dncspin/dncdungeon/dncdungeonunit/dncdungeonunit.mdl";
        }
        public MainWindow()
        {
           
            Application.Current.MainWindow.Show();
            try
            {
                File.Delete("./_retail_/replaceabletextures/tree-que/lordaerontree/lordaeronvillagetreeblight_diffuse.tif");
            }
            catch
            { }
            if (GetIniInt("mod", "2.2", 0) == 0)
            {
                WriteIniInt("mod", "2.2", 1);
                try { DelectDir("./quenching/temp"); } catch { }
            }
            //w3n读取实验
            dlbgck();

            try
            {
                if (System.IO.Directory.Exists(".//_retail_")) { dir_root = "./_retail_/"; }
                if (!Directory.Exists("./Quenching/temp")) { Directory.CreateDirectory("./Quenching/temp"); }
                if (!Directory.Exists("./Quenching/"))
                {
                    Directory.CreateDirectory("./Quenching/");
                }
            }
            catch { }
            
            //安装经典版文件
            Directory.CreateDirectory(".//_retail_//webui");
            if (!System.IO.Directory.Exists(".//_retail_//ui") && !System.IO.Directory.Exists(".//_retail_//ui-dis"))
            {
                Directory.CreateDirectory(".//_retail_//ui");
                streamrwDic("ui.zip", "./Quenching/temp/");
                unZipFiledist("./Quenching/temp/ui.zip", "./_retail_/ui");
            }
            //if (!System.IO.Directory.Exists(".//_retail_//units") && System.IO.Directory.Exists(".//_retail_//units-dis"))
            //{
            //   Directory.CreateDirectory(".//_retail_//units");
            //  streamrwDic("unitskin-new.txt", dir_root + "units/");
            // File.Copy(dir_root + "units/unitskin-new.txt", dir_root + "units/unitskin.txt");
            //}
            if (GetIniInt("mod", "off", 0) == 0)
            {
                Directory.CreateDirectory(dir_root + "units");
                streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt");
                if (GetIniInt("mod", "lockc", 0) == 1)
                { File.Delete(dir_root + "units/destructableskin.txt"); }
                if (GetIniInt("mod", "newold", 0) == 1)
                { streamname("destructableskin-old.txt", dir_root + "units/destructableskin.txt"); }
            }
            //initDNC();
            //Directory.CreateDirectory(".//_retail_//environment");
            //try { File.Delete("./Quenching/temp/environment.zip"); } catch { }
            //streamrwDic("environment.zip", "./Quenching/temp/");
            streamrwDic("unitskin-new.txt", "./Quenching/");
            streamrwDic("QuenchingOnCN.png", "./_retail_/webui/");
            streamrwDic("QuenchingOnEN.png", "./_retail_/webui/");
            
            try
            { DelectDir(dir_root + "abilities/weapons/hydraliskimpact"); }
            catch { }
            try 
            { DelectDir(dir_root + "units/demon/doomguardsummoned"); }
            catch { }
            try
            { DelectDir(dir_root + "units/demon/doomguard"); }
            catch { }
            try { DelectDir(dir_root + "abilities/weapons/meatwagonmissile"); } 
            catch { }
            //DelectDir("./_retail_/environment/dnc/");
            //DelectDir("./_retail_/environment/dnc45/");
            //DelectDir("./_retail_/environment/dncspin/");
            //unZipFiledist("./Quenching/temp/environment.zip", "./_retail_/environment");
            //setup_light();

            //更换游戏内标识 - 优先网络拉取文字 - 可能不需要了 - 语言设置
            if (GetIniInt("mod", "lang", 0) == 1)
            {
                try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
                readtrans = "./Quenching/trans-en.que";
                readhctrans = "./Quenching/hc-trans-en.que";
                

            }
            if (GetIniInt("mod", "lang", 0) == 0)
            {

                try { File.Copy(dir_root + "webui/QuenchingOnCN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
                readtrans = "./Quenching/trans.que";
                readhctrans = "./Quenching/hc-trans.que";
                streamname("Readme.docx", "./常见问题说明.docx");
            }
            if (GetIniInt("mod", "lang", 0) == 2)
            {

                try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
                readtrans = "./Quenching/trans-pt.que";
                readhctrans = "./Quenching/hc-trans-pt.que";

            }
            if (GetIniInt("mod", "lang", 0) == 3)
            {

                try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
                readtrans = "./Quenching/trans-ru.que";
                readhctrans = "./Quenching/hc-trans-ru.que";

            }
            if (GetIniInt("mod", "lang", 0) == 4)
            {

                try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
                readtrans = "./Quenching/trans-fr.que";
                readhctrans = "./Quenching/hc-trans-fr.que";

            }
            Directory.CreateDirectory(".//_retail_//webui//webms");
            if (!File.Exists("./_retail_/webui/webms/mainmenu2.webm"))
            {
                streamrwDic("mainmenu2.webm", dir_root + "webui/webms/");
                streamrwDic("mainmenu3.webm", dir_root + "webui/webms/");
            }
            initstring();
            //furi 目前就指向官网 baseuri 灵活
            //if (DownloadFile(severurl + "Baseuri.que", "./quenching/Baseuri.que"))
            //{ severurl = getonelineque("./quenching/Baseuri.que"); }
            //if (DownloadFile(fseverurl + "furi.que", "./quenching/furi.que"))
            //{ fseverurl = getonelineque("./quenching/furi.que"); }
            //检查更新
            if (!File.Exists(dir_root + "patch/keep.que"))
                try
                {
                    { File.Delete(dir_root + "webui/webms/mainmenu.webm"); }
                }
                catch { }
            //UI扣头
            //try { File.Delete(dir_root + "textures/portrait_bg_diffuse.dds"); } catch { }
            //try { File.Delete(dir_root + "textures/portrait_bg_diffuse.dds-dis"); } catch { }
            try
            {
                if (GetIniInt("mod", "ui", 0) == 1 || GetIniInt("mod", "ui", 0) == 2)
                {
                    try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-que/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
                    try { streamrwDic("portrait_bg_diffuse.tif", dir_root + "textures/"); } catch { }
                    try { streamrwDic("portrait_bg_orm.dds", dir_root + "textures/"); } catch { }
                }
                //if (!Directory.Exists(dir_root + "ui-blz/")) { copyf("./Quenching/ui-blz/", dir_root + "ui-blz/"); }
                if (GetIniInt("mod", "ui", 0) == 0)
                {
                    try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-org/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
                    try { File.Delete(dir_root + "textures/portrait_bg_diffuse.tif"); } catch { }
                    try { File.Delete(dir_root + "textures/portrait_bg_orm.dds"); } catch { }
                }
                //init parameter
            }
            catch { }
            //改建
            //hook.OnKeyDownEvent += new System.Windows.Forms.KeyEventHandler(hook_OnKeyDownEvent);
            //hook.OnKeyPressEvent += new System.Windows.Forms.KeyPressEventHandler(t_KeyPress);
            //尝试注册 + 检查更目录位置
            try { reg(); } catch { }

            if (File.Exists("./_retail_/x86_64/Warcraft III.exe") || File.Exists("./x86_64/Warcraft III.exe") || File.Exists("Warcraft III Launcher.exe")) { }
            else { MessageBox.Show(mbtext[2], mbtext[0]); Close(); return; }
            if (File.Exists(dir_root + "replaceabletextures/lordaerontree/lordaeronfalltree_diffuse.dds"))
            { MessageBox.Show(mbtext[52]); }
            //try { File.Copy("./Quenching/units/human/footman/ls_props_rackarmor_orm.dds", dir_root + "/units/human/footman/ls_props_rackarmor_orm.dds"); } catch (Exception e) { MessageBox.Show(); }
            InitializeComponent();
            init();
            initstring();
            InitUIstring();
            if (GetIniInt("mod", "lang", 0) == 1)
            {
                btnclickF(mainbtn_min_Copy1);
                btnclickT(mainbtn_min_Copy2);
                mainbtn_min_lang.Content = "English";
            }

            if (GetIniInt("mod", "lang", 0) == 2)
            {
                btnclickF(mainbtn_min_Copy1);
                btnclickT(mainbtn_min_Copy6);
                mainbtn_min_lang.Content = "Português";
            }
            if (GetIniInt("mod", "lang", 0) == 3)
            {

                btnclickF(mainbtn_min_Copy1);
                btnclickT(mainbtn_min_Copy7);
                mainbtn_min_lang.Content = "Pусский";
            }
            if (GetIniInt("mod", "lang", 0) == 4)
            {
                btnclickF(mainbtn_min_Copy1);
                btnclickT(mainbtn_min_Copy8);
                mainbtn_min_lang.Content = "Français";
            }
            if (File.Exists(dir_root + "units/undead/skeleton/undead_skeletonwarrior_main_diffuse.dds"))
            { btnclickT(setbtnc3); setbtnc3.Content = "已安装"; }
            //换ui 
            try
            {
                string[] lines = File.ReadAllLines(dir_root + "ui/ui-que/framedef/ui/resourcebar.fdf");
                lines[47] = "        Text \"" + cver + "\",";
                File.WriteAllLines(dir_root + "ui/ui-que/framedef/ui/resourcebar.fdf", lines); lines = null;
            }
            catch { }
            //

            mediaElement.Play();
            GridNowshow = maingrid;
            //战团锁
            cosunitlock[2] = true;
            cosunitlock[1] = true;
            cosunitlock[3] = true;
            cosunitlock[4] = true;
            //初始化按钮
            initDNC();
            //if (Directory.Exists(dir_root + "shaders/"))
            //{
            //    try
            //    { streamrwDic("hd.bls", dir_root + "shaders/ps/ui-que/hd.bls"); }
            //    catch
            //    { }
            //}
            try
            {

                if (GetIniInt("set", "sound", 0) == 1) { btnclickT(uibtnsm1_Copy); }    
                if (GetIniInt("mod", "off", 0) == 1)
                {
                    btnclickT(mainbtn_check_Copy5);
                    btnclickF(mainbtn_check_Copy6);
                }
                if (GetIniInt("mod", "lockc", 0) == 1)
                {
                    setbtn_no1.Visibility = Visibility.Visible;
                    setbtn_no2.Visibility = Visibility.Visible;
                    setbtn_no3.Visibility = Visibility.Visible;
                    setbtn_no4.Visibility = Visibility.Visible;
                    setbtn_no5.Visibility = Visibility.Visible;
                    setbtn_no6.Visibility = Visibility.Visible;
                    setbtn_no7.Visibility = Visibility.Visible;
                    setbtn_no8.Visibility = Visibility.Visible;
                    setbtn_no9.Visibility = Visibility.Visible;
                    uibtn_unitc.Visibility = Visibility.Visible;
                    btnclickT(mainbtn_min_Copy3);
                    btnclickF(mainbtn_min_Copy4);
                }

                if (GetIniInt("mod", "ad", 0) == 1)
                { btnclickF(setbtnc9_Copy); btnclickT(setbtnc10_Copy); }
                if (GetIniInt("mod", "ad", 0) == 0)
                { btnclickT(setbtnc9_Copy); btnclickF(setbtnc10_Copy); }
                if (GetIniInt("light", "light", 5) == 5)
                {
                    btnclickT(uibtnsm2_Copy);
                }
                if (GetIniInt("light", "light", 5) == 7)
                {
                    btnclickF(uibtnsm2_Copy); btnclickT(uibtnsm1_Copy3);
                }
                if (GetIniInt("light", "light", 5) == 9)
                {
                    btnclickF(uibtnsm2_Copy); btnclickT(uibtnsm1_Copy4);
                }
                //textBlock1_Copy5.Text = GetIniInt("light", "light", 5).ToString();
                //textBlock1_Copy4.Text = GetIniInt("light", "shadow", 5).ToString();
                if (GetIniInt("mod", "lang", 0) == 1)
                {
                    btnclickT(themey);
                }
                if (GetIniInt("mod", "lang", 0) == 2)
                {
                    btnclickT(themey_Copy);
                }
                if (GetIniInt("mod", "lang", 0) == 3)
                {
                    btnclickT(themey_Copy1);
                }
                if (GetIniInt("mod", "lang", 0) == 4)
                {
                    btnclickT(themey_Copy2);
                }
                if (GetIniInt("mod", "lockh", 0) == 1) { btnclickT(mainbtn_min_Copy4); hdlock = true; }
                if (GetIniInt("mod", "lockc", 0) == 1) { btnclickT(mainbtn_min_Copy3); sdlock = true; }
                if (GetIniInt("set", "vio", 0) == 1)
                { setbtn_about_Copy1.Visibility = Visibility.Visible; }
                //if (GetIniInt("mod", "ad", 0) == 1) { uiadjust.Visibility = Visibility.Visible; }
                if (GetIniInt("mod", "melee", 0) == 1)
                {
                    //btnclickF(setbtn_o);
                    btnclickT(setbtn_m); btnclickF(setbtn_n); uibtn_unitc.Visibility = Visibility.Hidden;
                    setbtn_no6.Visibility = Visibility.Hidden;
                    setbtn_no1.Visibility = Visibility.Visible;
                    //setbtn_no10.Visibility = Visibility.Visible;
                    setbtn_no6.Visibility = Visibility.Visible;
                }
                if (GetIniInt("mod", "old", 0) == 1)
                {
                    //btnclickT(setbtn_o);
                    btnclickF(setbtn_m); btnclickF(setbtn_n); uibtn_unitc.Visibility = Visibility.Visible;
                    setbtn_no6.Visibility = Visibility.Visible;
                    setbtn_no1.Visibility = Visibility.Hidden;
                    //setbtn_no10.Visibility = Visibility.Hidden;
                }
                if (GetIniInt("mod", "melee", 0) == 0 && GetIniInt("mod", "old", 0) == 0)
                {
                    //btnclickF(setbtn_o);
                    btnclickF(setbtn_m); btnclickT(setbtn_n);
                }
                if (GetIniInt("set", "trees", 1) == 1)
                {
                    btnclickT(setbtnc1_Copy);
                    btnclickF(setbtnc2_Copy);
                }
                if (GetIniInt("set", "tile", 1) == 1)
                {
                    btnclickT(setbtnc1_Copy1);
                    btnclickF(setbtnc2_Copy1);
                }
                if (GetIniInt("mod", "unitchange", 1) == 1)
                { WriteIniInt("mod", "unitchange", 1); }
                if (GetIniInt("mod", "old", 0) == 1)
                {
                    uibtn_unitc.Visibility = Visibility.Visible;
                }
                if (GetIniInt("mod", "melee", 0) == 1)
                {
                    setbtn_no1.Visibility = Visibility.Visible;
                    //setbtn_no10.Visibility = Visibility.Visible;
                    setbtn_no6.Visibility = Visibility.Visible;
                }
                if (GetIniInt("tree", "short", 0) == 1)
                {
                    btnclickT(newt3b1);
                    btnclickF(newt3b2);
                }
                else
                {
                    btnclickT(newt3b2);
                    btnclickF(newt3b1);
                }
                if (GetIniInt("mod", "newold", 0) == 0)
                {
                    btnclickF(newt2b1);
                    btnclickT(newt2b2);
                }
                else
                {
                    btnclickT(newt2b1);
                    btnclickF(newt2b2);
                }
                if (GetIniInt("light", "light", 5) == 5) { btnclickT(uibtnsm1_Copy2); btnclickF(uibtnsm1_Copy3); btnclickF(uibtnsm1_Copy4); }
                if (GetIniInt("light", "light", 5) == 7) { btnclickF(uibtnsm1_Copy2); btnclickT(uibtnsm1_Copy3); btnclickF(uibtnsm1_Copy4); }
                if (GetIniInt("light", "light", 5) == 9) { btnclickF(uibtnsm1_Copy2); btnclickF(uibtnsm1_Copy3); btnclickT(uibtnsm1_Copy4); }
                if (GetIniInt("mod", "dline", 0) == 0) { btnclickT(mainbtn_check_Copy35); } else { btnclickT(mainbtn_check_Copy36); }
                //if (GetIniInt("mod", "w3c", 0) == 1) { btnclickT(mainbtn_check_Copy1); mainbtn_check_Copy1.Content = mbtext[9]; } else { btnclickF(mainbtn_check_Copy1); mainbtn_check_Copy1.Content = mbtext[10]; }
                if (GetIniInt("mod", "gpuset", 0) == 0) { btnclickT(mb_gpu_2); btnclickF(mb_gpu_1); } else { btnclickT(mb_gpu_1); btnclickF(mb_gpu_2); }
                if (GetIniInt("coshero", "1", 1) == 1) { btnclickT(cosc1); } else { btnclickF(cosc2); }
                if (GetIniInt("mod", "version", 0) == 0) { btnclickT(mainbtn_check_Copy7); btnclickF(mainbtn_check_Copy); } else { btnclickF(mainbtn_check_Copy7); btnclickT(mainbtn_check_Copy); }
                //if (GetIniInt("mod", "unitchange", 1) == 1) { btnclickT(setbtnc1); btnclickF(setbtnc2); } else { btnclickF(setbtnc1); btnclickT(setbtnc2); }
                //if (GetIniInt("mod", "vio", 0) == 1) { btnclickT(setbtnc3); btnclickF(setbtnc4); } else { btnclickF(setbtnc3); btnclickT(setbtnc4); }
                if (GetIniInt("mod", "water", 0) == 0) { btnclickT(setbtnc5); btnclickF(setbtnc6); } else { btnclickF(setbtnc5); btnclickT(setbtnc6); }
                if (GetIniInt("mod", "foliage", 1) == 1) { btnclickT(setbtnc7); btnclickF(setbtnc8); } else { btnclickF(setbtnc7); btnclickT(setbtnc8); }
                if (GetIniInt("mod", "shader", 1) == 1) { btnclickT(setbtnc9); btnclickF(setbtnc10); } else { btnclickF(setbtnc9); btnclickT(setbtnc10); }
                if (GetIniInt("mod", "light", 1) == 0) { btnclickT(setbtnc11); btnclickF(setbtnc12); } else { btnclickF(setbtnc11); btnclickT(setbtnc12); }
                if (GetIniInt("mod", "ui", 0) == 0) { btnclickT(uibtn1); try { File.Move(dir_root + "textures/portrait_bg_diffuse.tif", dir_root + "textures/portrait_bg_diffuse.tif-dis"); } catch { } }
                if (GetIniInt("mod", "ui", 0) == 1) { btnclickT(uibtn2); try { File.Move(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { } }
                if (GetIniInt("mod", "ui", 0) == 2) { btnclickT(uibtn3); try { File.Move(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { } }
                //if (GetIniInt("mod", "selection", 1) == 1) { btnclickT(uibtnsm3); btnclickF(uibtnsm4); } else { btnclickF(uibtnsm3); btnclickT(uibtnsm4); }
                if (GetIniInt("mod", "hg", 1) == 1) { btnclickT(uibtnsm1); btnclickF(uibtnsm2); } else { btnclickF(uibtnsm1); btnclickT(uibtnsm2); }
                if (GetIniInt("mod", "half", 0) == 1) { btnclickT(uibtnsm5); btnclickF(uibtnsm6); } else { btnclickF(uibtnsm5); btnclickT(uibtnsm6); }
                //if (GetIniInt("mod", "light", 0) == 1) { btnclickF(setbtnc11); btnclickT(setbtnc12); } else { btnclickT(setbtnc11); btnclickF(setbtnc12); }
                //if (GetIniInt("mod", "camp", 1) == 1) { btnclickT(achbtc1); btnclickF(achbtc2); }
                ;

                if (GetIniInt("camp", "diff", 0) == 2) { map_diff = 2; btnclickT(mainbtn_check_Copy10); btnclickF(achbtn1_Copy21); btnclickF(mainbtn_reset_Copy1); }
                if (GetIniInt("camp", "diff", 0) == 1) { map_diff = 1; btnclickF(mainbtn_check_Copy10); btnclickT(achbtn1_Copy21); btnclickF(mainbtn_reset_Copy1); }
                if (GetIniInt("camp", "diff", 0) == 0) { map_diff = 0; btnclickF(mainbtn_check_Copy10); btnclickF(achbtn1_Copy21); btnclickT(mainbtn_reset_Copy1); }
                StringBuilder temp = new StringBuilder(20);
                GetIniString("fog", "4", "5000", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("fog", "3", "1", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("fog", "2", "1", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("fog", "1", "1", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("gamma", "1", "166", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("cam", "2", "308", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("cam", "1", "75", temp, 20);

                temp = new StringBuilder(20);
                GetIniString("key", "1", "", temp, 20);
                num1.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "2", "", temp, 20);
                num2.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "3", "", temp, 20);
                num3.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "4", "", temp, 20);
                num4.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "5", "", temp, 20);
                num5.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "6", "", temp, 20);
                num6.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "7", "", temp, 20);
                ck1.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "8", "", temp, 20);
                ck2.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "9", "", temp, 20);
                ck3.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "10", "", temp, 20);
                ck4.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "11", "", temp, 20);
                ck5.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "12", "", temp, 20);
                ck6.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "13", "", temp, 20);
                ck7.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "14", "", temp, 20);
                ck8.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "15", "", temp, 20);
                ck9.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "16", "", temp, 20);
                ck10.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "17", "", temp, 20);
                ck11.Text = temp.ToString();
                temp = new StringBuilder(20);
                GetIniString("key", "18", "", temp, 20);
                ck12.Text = temp.ToString();
                temp = new StringBuilder(20);
                cosherostate((1).ToString(), (2).ToString());
                cos_hero_pos = cos_hero_now[cosheroflag, 0];
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
                if (GetIniInt("mod", "key", 0) == 1)
                {
                    isHookEnable = true;
                    uikey.Visibility = Visibility.Visible;

                    btnclickT(uibtnsm1_Copy);
                    btnclickF(uibtnsm2_Copy1);
                }
                if (GetIniInt("cosunit", "orc", 0) == 1)
                {
                    btnclickT(cosunitbtn2);
                    btnclickF(cosunitbtn1);
                    cosunitpic = "cosunitorc1.png";
                    cosuniti.Source = new BitmapImage(new Uri("cosunitorc1.png", UriKind.Relative));
                }

            }
            catch (Exception e) { }
            //有多少部分被下载了
            System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
            tmr.Interval = TimeSpan.FromSeconds(5);
            tmr.Tick += new EventHandler(Count_Download_Mod_Part);
            tmr.Start();
            //看看有没有最新版本，但是静默查看
            if (DownloadFile(fseverurl + "version.que", "./quenching/version.que"))
            {
                cver = getonelineque("./quenching/version.que");
                this.Dispatcher.Invoke(() =>
                {
                    maincheckt.Text = mainstring[1] + System.Environment.NewLine + cver;
                });
                if (cver != ver)
                {
                    this.Dispatcher.Invoke(() =>
                    { maincheckt.Text = mainstring[24] + System.Environment.NewLine + cver; });
                }
            }
            else
            {
                this.Dispatcher.Invoke(() =>
                { maincheckt.Text = mainstring[2] + System.Environment.NewLine + ver; });
            }
            initc = true;
            //btnclickT(setbtnc11);
            //btnclickF(setbtnc12);
            //fileloadflag = 6;
            //WriteIniInt("mod", "light", 0);
            //GPU

        }
        void Count_Download_Mod_Part(object sender, EventArgs e)
        {
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy11); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy12); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy13); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy14); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy15); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy16); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy17); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy18); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy19); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy20); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy21); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy22); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy23); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy24); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy25); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy26); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy27); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy28); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy29); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy30); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy31); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy32); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy33); });
            this.Dispatcher.Invoke(() => { btnclickF(mainbtn_check_Copy34); });
            if (File.Exists("quenching/temp/patch-1.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy11); }); }
            if (File.Exists("quenching/temp/patch-2.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy12); }); }
            if (File.Exists("quenching/temp/patch-3.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy14); }); }
            if (File.Exists("quenching/temp/patch-4.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy13); }); }
            if (File.Exists("quenching/temp/patch-5.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy15); }); }
            if (File.Exists("quenching/temp/patch-6.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy20); }); }
            if (File.Exists("quenching/temp/patch-7.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy25); }); }
            if (File.Exists("quenching/temp/patch-8.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy30); }); }
            if (File.Exists("quenching/temp/patch-9.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy16); }); }
            if (File.Exists("quenching/temp/patch-10.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy21); }); }
            if (File.Exists("quenching/temp/patch-11.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy26); }); }
            if (File.Exists("quenching/temp/patch-12.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy31); }); }
            if (File.Exists("quenching/temp/patch-13.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy17); }); }
            if (File.Exists("quenching/temp/patch-14.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy22); }); }
            if (File.Exists("quenching/temp/patch-15.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy27); }); }
            if (File.Exists("quenching/temp/patch-16.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy32); }); }
            if (File.Exists("quenching/temp/patch-17.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy18); }); }
            if (File.Exists("quenching/temp/patch-18.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy23); }); }
            if (File.Exists("quenching/temp/patch-19.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy28); }); }
            if (File.Exists("quenching/temp/patch-20.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy33); }); }
            if (File.Exists("quenching/temp/patch-21.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy19); }); }
            if (File.Exists("quenching/temp/patch-22.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy24); }); }
            if (File.Exists("quenching/temp/patch-23.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy29); }); }
            if (File.Exists("quenching/temp/patch-24.zip"))
            { this.Dispatcher.Invoke(() => { btnclickT(mainbtn_check_Copy34); }); }
        }
        public void dlbgck()
        {
            try
            {
                streamrw("CASCLib.NET.dll");
                streamrw("StormLib.dll");
                streamrw("StormLibSharp.dll");
                streamrw("ICSharpCode.SharpZipLib.dll");
                streamrw("cfix.w3x");
                File.Delete("./Quenching/trans.que");
                File.Delete("./Quenching/trans-en.que");
                File.Delete("./Quenching/trans-ru.que");
                File.Delete("./Quenching/trans-pt.que");
                File.Delete("./Quenching/trans-fr.que");
                File.Delete("./Quenching/hc-trans.que");
                File.Delete("./Quenching/hc-trans-en.que");
                File.Delete("./Quenching/hc-trans-ru.que");
                File.Delete("./Quenching/hc-trans-pt.que");
                File.Delete("./Quenching/hc-trans-fr.que");
            }
            catch { }
            try
            {
                streamrwTQ("trans.que");
                streamrwTQ("trans-en.que");
                streamrwTQ("hc-trans.que");
                streamrwTQ("hc-trans-en.que");
                streamrwTQ("trans-pt.que");
                streamrwTQ("hc-trans-pt.que");
                streamrwTQ("trans-ru.que");
                streamrwTQ("hc-trans-ru.que");
                streamrwTQ("trans-fr.que");
                streamrwTQ("hc-trans-fr.que");
                streamrwTQ("EULA.docx");
                streamrwTQ("EULAEN.docx");
                streamrwTQ("half.que");
                streamrw("reg.reg");
                if (!File.Exists("./Quenching/ck1.mp3")) { streamrw("quenching/ck1.mp3"); }
                if (!File.Exists("./Quenching/ck2.mp3")) { streamrw("quenching/ck2.mp3"); }
                if (!File.Exists("./Quenching/ck3.mp3")) { streamrw("quenching/ck3.mp3"); }
                //if (!File.Exists("./Quenching/quenchingBG.avi")) { streamrw("quenching/quenchingBG.avi"); }
                if (!File.Exists("./Quenching/mainmenu3.mp4")) { streamname("mainmenu3.webm", "quenching/mainmenu3.mp4"); }

            }
            catch { }
        }
        public void streamrw(string filestring)
        {
            Stream readStream = Application.GetResourceStream(new Uri("pack://application:,,,/" + filestring)).Stream;
            Stream writeStream = File.OpenWrite("./" + filestring);
            byte[] data = new byte[1024];//用来存放读取流中读取到的数据
            while (true)//因为FileStream的Read方法在读取的数据超过存放的count长度的时候是分多次读取，所以我们用一个死循环
            {
                int length = readStream.Read(data, 0, data.Length);//data是存放的字节数组，0是从字节数组的哪个位置开始存放，data.Length是可存放的容量大小，返回值length是实际存放的大小
                if (length == 0)//当FileStream的Read方法读取到文件尾部的时候，会返回0
                {
                    Console.WriteLine("写入结束");
                    break;
                }
                else
                {
                    writeStream.Write(data, 0, length);//将数据流写入，data是写入的字节数组，0是从字节数组哪个位置开始写入，length是写入的长度
                }
            }
            writeStream.Close();//关闭文件流
            readStream.Close();//关闭文件流
        }
        public void streamrwTQ(string filestring)
        {
            Console.WriteLine(filestring);
            Stream readStream = Application.GetResourceStream(new Uri("pack://application:,,,/" + filestring)).Stream;
            Stream writeStream = File.OpenWrite("./Quenching/" + filestring);
            byte[] data = new byte[1024];//用来存放读取流中读取到的数据
            while (true)//因为FileStream的Read方法在读取的数据超过存放的count长度的时候是分多次读取，所以我们用一个死循环
            {
                int length = readStream.Read(data, 0, data.Length);//data是存放的字节数组，0是从字节数组的哪个位置开始存放，data.Length是可存放的容量大小，返回值length是实际存放的大小
                if (length == 0)//当FileStream的Read方法读取到文件尾部的时候，会返回0
                {
                    Console.WriteLine("写入结束");
                    break;
                }
                else
                {
                    writeStream.Write(data, 0, length);//将数据流写入，data是写入的字节数组，0是从字节数组哪个位置开始写入，length是写入的长度
                }
            }
            writeStream.Close();//关闭文件流
            readStream.Close();//关闭文件流
        }

        public void streamrwDic(string filestring, string dist)
        {
            Console.WriteLine(filestring);
            Stream readStream = Application.GetResourceStream(new Uri("pack://application:,,,/" + filestring)).Stream;
            Stream writeStream = File.OpenWrite(dist + filestring);
            byte[] data = new byte[1024];//用来存放读取流中读取到的数据
            while (true)//因为FileStream的Read方法在读取的数据超过存放的count长度的时候是分多次读取，所以我们用一个死循环
            {
                int length = readStream.Read(data, 0, data.Length);//data是存放的字节数组，0是从字节数组的哪个位置开始存放，data.Length是可存放的容量大小，返回值length是实际存放的大小
                if (length == 0)//当FileStream的Read方法读取到文件尾部的时候，会返回0
                {
                    Console.WriteLine("写入结束");
                    break;
                }
                else
                {
                    writeStream.Write(data, 0, length);//将数据流写入，data是写入的字节数组，0是从字节数组哪个位置开始写入，length是写入的长度
                }
            }
            writeStream.Close();//关闭文件流
            readStream.Close();//关闭文件流
        }

        public void streamname(string filestring, string dist)
        {
            //Console.WriteLine(filestring);
            Stream readStream = Application.GetResourceStream(new Uri("pack://application:,,,/" + filestring)).Stream;
            Stream writeStream = File.OpenWrite(dist);
            byte[] data = new byte[1024];//用来存放读取流中读取到的数据
            while (true)//因为FileStream的Read方法在读取的数据超过存放的count长度的时候是分多次读取，所以我们用一个死循环
            {
                int length = readStream.Read(data, 0, data.Length);//data是存放的字节数组，0是从字节数组的哪个位置开始存放，data.Length是可存放的容量大小，返回值length是实际存放的大小
                if (length == 0)//当FileStream的Read方法读取到文件尾部的时候，会返回0
                {
                    Console.WriteLine("写入结束");
                    break;
                }
                else
                {
                    writeStream.Write(data, 0, length);//将数据流写入，data是写入的字节数组，0是从字节数组哪个位置开始写入，length是写入的长度
                }
            }
            writeStream.Close();//关闭文件流
            readStream.Close();//关闭文件流
        }
        public bool[] achchecked = new bool[60];
        public int hdbool = 0;
        public int GPUbool = 0;
        public int w3cbool = 0;
        public bool hdlock = false;
        public bool sdlock = false;
        public void theout1()
        {
            //hd
            try
            {
                hdbool = 1;
                fileloadflag = 3;
                Thread thread = new Thread(new ThreadStart(filetemplate));
                thread.Start();
                WriteIniInt("mod", "hdorsd", 0);
                oldorsd = 0;
                this.Dispatcher.Invoke(() => { textBlock_Copy2.Text = mbtext[30]; cost1_Copy1.Text = mbtext[50]; });
                Directory.CreateDirectory(dir_root + "units/units-que/");
                try { File.Copy(dir_root + "units/units-que/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                try
                {
                    streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt");

                }
                catch { }
            }
            catch { }
        }
        public void theout2()
        {
            //hd
            try
            {
                hdbool = 2;
                fileloadflag = 2;
                Thread thread = new Thread(new ThreadStart(filetemplate));
                thread.Start();
                oldorsd = 1;
                WriteIniInt("mod", "hdorsd", 1);
                Directory.CreateDirectory(dir_root + "units/units-old/");
                this.Dispatcher.Invoke(() => { textBlock_Copy2.Text = mbtext[29]; cost1_Copy1.Text = mbtext[49]; });
                try { File.Copy(dir_root + "units/units-old/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                try { File.Delete(dir_root + "units/destructableskin.txt"); } catch { }
            }
            catch { }
            //取消oldorsd

            try
            {
                if (GetIniInt("mod", "old", 0) == 1)
                {
                    this.Dispatcher.Invoke(() => { textBlock_Copy2.Text = mbtext[32]; cost1_Copy1.Text = mbtext[49]; });
                }
                if (GetIniInt("mod", "melee", 0) == 1)
                {
                    this.Dispatcher.Invoke(() => { textBlock_Copy2.Text = mbtext[45]; cost1_Copy1.Text = mbtext[50]; });
                }
                else if (hdbool == 1)
                { this.Dispatcher.Invoke(() => { textBlock_Copy2.Text = mbtext[30]; cost1_Copy1.Text = mbtext[50]; }); }

            }
            catch { }
            //achievment

        }
        public string readtrans = "./Quenching/trans.que";
        public string readhctrans = "./Quenching/hc-trans.que";
        public void InitUIstring()
        {
            string[] temp = new string[2000];
            int tempi = 0;
            int j = 0;
            bool readflag = false;
            try
            {

                StreamReader sr = new StreamReader(readhctrans);
                string line;
                // 从文件读取并显示行，直到文件的末尾 
                while ((line = sr.ReadLine()) != null)
                {
                    line = line.Replace("\\n", "\n");
                    temp[tempi] = line;
                    tempi++;
                    readflag = true;
                }
                sr.Close();
            }
            catch { }

            mainbtn_min_Copy5.Content = temp[162];//基础设置
            mainbtn_about_Copy.Content = temp[163];//基础设置
            dl_m_mod_title.Text = temp[164];//基础设置
            mainbtn_check_Copy8.Content = temp[165];//基础设置
            mainbtn_check_Copy35.Content = temp[166];//基础设置
            mainbtn_check_Copy36.Content = temp[167];//基础设置
            dl_m_mod_title_Copy.Text = temp[168];//基础设置
            dl_m_mod_title_Copy3.Text = temp[169];//基础设置
            dl_m_mod_title_Copy1.Text = temp[170];//基础设置
            dl_m_mod_title_Copy2.Text = temp[171];//基础设置
            dlogot1.Text = temp[172];//基础设置
            dlogot1_Copy.Text = temp[173];//基础设置
            dlogot1_Copy1.Text = temp[174];//基础设置
            dlogot1_Copy2.Text = temp[175];//基础设置
            dlogot1_Copy3.Text = temp[176];//基础设置
            newBlock1.Text = temp[177];//基础设置
            newt2t1.Text = temp[178];//基础设置
            newt2t2.Text = temp[179];//基础设置
            newt2t1_Copy1.Text = temp[180];//基础设置
            newt2t2_Copy.Text = temp[181];//基础设置
            uit2_new.Text = temp[182];//基础设置
            uishowt2.Text = temp[183];//基础设置
            uibtnsm1_Copy5.Content = temp[184];//基础设置
            newt2t1_Copy.Text = temp[185];//基础设置
            uishowt2_Copy.Text = temp[186];//基础设置
            uibtnsm1_Copy1.Content = temp[187];//基础设置
            cost2_Copy.Text = temp[188];//基础设置
            acht1_Copy.Text = temp[189];//基础设置
            acht1_Copy1.Text = temp[190];//基础设置
            dl_m_lang_title.Text = temp[191];
            newt3b1.Content = temp[48];//打开
            newt3b2.Content = temp[49];//关闭
            newt2b2.Content = temp[49];//关闭
            newt2b1.Content = temp[48];//打开
            //if (File.Exists(dir_root + "terrainart/clifftypes.slk") || File.Exists(dir_root + "terrainart-dis/clifftypes.slk"))
            //{ textBlock_Copy2.Text = mbtext[30]; }
            //else
            //{ textBlock_Copy2.Text = mbtext[29]; }
            if (readflag)
            {
                textBlock_Copy.Text = temp[j]; j++;
                textBlock.Text = temp[j]; j++;
                maincheckt.Text = temp[j] + System.Environment.NewLine + cver; j++;
                button2.Content = temp[j]; j++;
                textBlock_Copy3.Text = temp[j]; j++;
                mainbtn_update.Content = temp[j]; j++;
                mainbtn_reset.Content = temp[j]; j++;
                //mainbtn_check_Copy.Content = temp[j]; 
                j++;
                j++;
                mainbtn_about.Content = temp[j]; j++;
                j++;
                j++;
                mainbtn_check_Copy4.Content = temp[j]; j++;
                mainbtn_check_Copy2.Content = temp[j]; j++;
                //textBlock_Copy1.Text = temp[j]; 
                j++;
                btnset.Content = temp[j]; j++;
                btnui.Content = temp[j]; j++;
                btnmain.Content = temp[j]; j++;
                btncos.Content = temp[j]; j++;
                btnach.Content = temp[j]; j++;
                thxt.Text = temp[j]; j++;
                button_Copy.Content = temp[j]; j++;
                button.Content = temp[j]; j++;
                button_Copy1.Content = temp[j]; j++;
                thxt1.Text = temp[j]; j++;
                thxt1_Copy.Text = temp[j]; j++;
                button_Copy3.Content = temp[j]; j++;
                button_Copy4.Content = temp[j]; j++;
                thxt3.Text = temp[j]; j++;
                thxtt1.Text = temp[j]; j++;
                thxlistt1.Text = temp[j]; j++;
                thxt5_Copy3.Text = temp[j]; j++;
                textBox1.Text = temp[j]; j++;

                textBlock1.Text = temp[j]; j++;
                //textBlock1_Copy.Text = temp[j];
                j++;
                //textBlock1_Copy1.Text = temp[j];
                j++;
                //textBlock1_Copy2.Text = temp[j];
                j++;
                setbtn2.Text = temp[j]; j++;
                setbtn_about_Copy.Text = temp[j]; j++;
                setbtn4.Text = temp[j]; j++;
                //setbtn7.Text = temp[j]; 
                j++;
                //setbtn8.Text = temp[j]; 
                j++;
                //setbtn_about.Text = temp[j]; 
                j++;
                setbtn3.Text = temp[j]; j++;
                setbtn5.Text = temp[j]; j++;
                setbtn6.Text = temp[j]; j++;
                setbtn9.Text = temp[j]; j++;

                setbtn_about_Copy1.Content = temp[j];

                //setbtn_about_Copy19.Content = temp[j];
                //setbtn_about_Copy16.Content = temp[j];
                j++;

                setbtnc5.Content = temp[j];
                setbtnc7.Content = temp[j];
                setbtnc9.Content = temp[j];
                setbtnc3.Content = temp[j];
                setbtnc1_Copy.Content = temp[j];
                setbtnc1_Copy1.Content = temp[j];
                //setbtnc1.Content = temp[j];
                setbtnc11.Content = temp[j]; j++;

                setbtnc6.Content = temp[j];
                setbtnc8.Content = temp[j];
                setbtnc10.Content = temp[j];
                setbtnc2_Copy.Content = temp[j];
                setbtnc2_Copy1.Content = temp[j];
                setbtnc10_Copy.Content = temp[j];
                //setbtnc2.Content = temp[j];
                setbtnc12.Content = temp[j]; j++;

                //textBlock1_Copy4.Text = temp[j]; 
                j++;

                //uit1.Text = temp[j];
                j++;
                uit2.Text = temp[j]; j++;
                uibtn1.Content = temp[j]; j++;
                uibtn2.Content = temp[j]; j++;
                uibtn3.Content = temp[j]; j++;
                //uit2_Copy.Text = temp[j];
                j++;
                uibtn4.Text = temp[j]; j++;
                //uibtn5.Content = temp[j];
                j++;
                //uibtn6.Content = temp[j]; 
                j++;
                //uit2_Copy3.Text = temp[j];
                j++;
                j++;
                j++;
                j++;

                uibtnsm1.Content = temp[j];
                //uibtnsm3.Content = temp[j];
                uibtnsm5.Content = temp[j];
                uibtnsm1_Copy.Content = temp[j];
                uibtnsm1_Copy2.Content = temp[j];


                setbtnc9_Copy.Content = temp[j];
                j++;

                uibtnsm2.Content = temp[j];
                //uibtnsm4.Content = temp[j];
                uibtnsm6.Content = temp[j];
                uibtnsm2_Copy1.Content = temp[j];
                j++;

                uit2_Copy5.Text = temp[j]; j++;
                uit2_Copy6.Text = temp[j]; j++;
                uibtn2_Copy1.Content = temp[j]; j++;
                uibtn2_Copy5.Content = temp[j]; j++;
                uibtn2_Copy.Content = temp[j]; j++;
                uibtn2_Copy3.Content = temp[j]; j++;
                uibtn2_Copy4.Content = temp[j]; j++;

                j++;
                j++;
                j++;
                j++;
                j++;
                j++;
                j++;
                j++;
                j++;

                cost.Text = temp[j]; j++;
                cost1.Text = temp[j]; j++;
                cosbtn1.Content = temp[j]; j++;
                cosbtn1_Copy.Content = temp[j]; j++;
                cost1_Copy.Text = temp[j]; j++;
                cosherotext.Text = temp[j]; j++;
                cost1_Copy1.Text = temp[j]; j++;
                cosc1.Content = temp[j]; j++;
                cosc2.Content = temp[j]; j++;
                cosc3.Content = temp[j]; j++;
                cosc4.Content = temp[j]; j++;
                cuoldbtn.Content = temp[j]; j++;
                textBlock3.Text = temp[j]; j++;
                textBlock3_Copy.Text = temp[j]; j++;
                oldbtn1.Content = temp[j]; j++;

                cosunitt.Text = temp[j]; j++;
                cosbtn1_Copy7.Content = temp[j]; j++;
                cosbtn1_Copy8.Content = temp[j]; j++;
                cosbtn1_Copy9.Content = temp[j]; j++;
                cosbtn1_Copy10.Content = temp[j]; j++;
                cosunitt1.Text = temp[j]; j++;
                cosunitt2.Text = temp[j]; j++;
                cosunitbtn1.Content = temp[j]; j++;
                cosunitbtn2.Content = temp[j]; j++;
                cosunitbtn3.Content = temp[j]; j++;
                cosunitbtn4.Content = temp[j]; j++;

                acht.Text = temp[j]; j++;
                acht1.Text = temp[j]; j++;
                //achbtn1.Content = temp[j]; 
                j++;
                //setbtn11_about_Copy.Content = temp[j];
                j++;
                //acht1_Copy.Text = temp[j];
                j++;
                //achbtn2.Content = temp[j];
                j++;
                achbtn1_Copy1.Content = temp[j]; j++;
                //achbtn2_Copy.Content = temp[j];
                j++;
                //achbtn2_Copy1.Content = temp[j];
                //achbtn2_Copy2.Content = temp[j];
                j++;
                acht1_Copy1.Text = temp[190];

                StringBuilder temps = new StringBuilder(100);
                GetIniString("fog", "4", "temp[j]", temps, 100);
                if (!(temps.ToString() == "" || temps.ToString() == null))
                {
                    temps = new StringBuilder(100);
                    GetIniString("ccmt", "0", "", temps, 100);
                    acht1_Copy1.Text = temps.ToString();
                    for (int i = 0; i < 35; i++)
                    {
                        temps = new StringBuilder(100);
                        GetIniString("ccm", i.ToString(), "", temps, 100);
                        campb[i].Content = "#" + (i + 1) + " " + temps.ToString();

                    }
                }

                j++;

                //achmaint1.Text = temp[j];
                j++;
                //achmaint2.Text = temp[j];
                j++;
                achshowt1.Text = temp[j]; j++;
                achshowt2.Text = temp[j]; j++;
                j++;
                j++;
                j++;
                j++;
                j++;

                updatet.Text = temp[j]; j++;
                updatet1.Text = temp[j]; j++;
                button3.Content = temp[j]; j++;
                //战役语言
                mainbtn_reset_Copy.Content = temp[j]; j++;
                mainbtn_min_Copy1.Content = temp[j]; j++;
                mainbtn_min_Copy2.Content = temp[j]; j++;
                //模式
                setbtn_n.Content = temp[j]; j++;
                setbtn_m.Content = temp[j]; j++;
                //setbtn_o.Content = temp[j]; 
                j++;
                //安装mod
                mainbtn_check_Copy1.Content = temp[j]; j++;
                //mainbtn_check_Copy.Content = temp[j]; 
                j++;
                //锁定模式
                mainbtn_min_Copy3.Content = temp[j]; j++;
                mainbtn_min_Copy4.Content = temp[j]; j++;
                textBlock_Copy2.Text = mbtext[30];
                //安装视频
                mainbtn_check_Copy3.Content = temp[j]; j++;

                setbtn_no1.Content = mbtext[36];
                setbtn_no2.Content = mbtext[36];
                setbtn_no3.Content = mbtext[36];
                setbtn_no4.Content = mbtext[36];
                setbtn_no5.Content = mbtext[36];
                setbtn_no6.Content = mbtext[36];
                setbtn_no7.Content = mbtext[36];
                setbtn_no8.Content = mbtext[36];
                setbtn_no9.Content = mbtext[36];
                //setbtn_no10.Content = mbtext[36];
                uibtn_unitc.Content = mbtext[36];
                cosunitbtn3.Content = temp[j]; j++;

                mainbtn_check_Copy6.Content = temp[j]; j++;
                mainbtn_check_Copy5.Content = temp[j]; j++;
                button2_Copy.Content = temp[j]; j++;
                themey.Content = temp[j]; j++;
                themey_Copy.Content = temp[j]; j++;
                themey_Copy1.Content = temp[j]; j++;
                themey_Copy2.Content = temp[j]; j++;
                themey_Copy3.Content = temp[j]; j++;
                themet1.Text = temp[j]; j++;
                themet2.Text = temp[j]; j++;
                //textBlock1_Copy3.Text = temp[j];
                j++;
                //setbtn3_Copy.Content = temp[j];
                j++;
                //setbtn3_Copy1.Content = temp[j];
                j++;
                button2_Copy1.Content = temp[j]; ccos.Text = "-" + temp[j] + "-"; achmaint1.Text = cosherostring[ccos_page]; j++;
                uibtn6.Text = temp[j]; j++;
                uit2_Copy.Text = temp[j]; j++;
                setbtn9_Copy.Text = temp[j]; j++;
                uibtnsm1_Copy.Content = temp[j]; j++;
                mainbtn_check_Copy9.Content = temp[j]; j++;

            }
        }
        protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
        {
            base.OnMouseLeftButtonDown(e);
            // Begin dragging the window
            try { this.DragMove(); }
            catch { }

        }

        private void mediaElement_MediaEnded(object sender, RoutedEventArgs e)
        {
            mediaElement.Position = TimeSpan.Zero;
            mediaElement.Play();
        }

        private void textBox_TextChanged(object sender, TextChangedEventArgs e)
        {

        }

        public Grid GridNowshow;
        public Grid GridReadyshow;
        public bool GridChangeFlag;

        private void button_Click(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("mod", "off", 0) == 1)
            {
                MessageBox.Show("不能在Mod关闭时进行设置"); return; //
            }
            if (GridChangeFlag == false)
            {
                mb.Visibility = Visibility.Hidden;
                mb1.Visibility = Visibility.Hidden;
                mb2.Visibility = Visibility.Visible;
                mb3.Visibility = Visibility.Hidden;
                mb4.Visibility = Visibility.Hidden;
                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = setgrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
        }

        void fadeout(object sender, EventArgs e)
        {
            if (GridReadyshow.Visibility == Visibility.Hidden)
            {
                GridNowshow.Opacity = GridNowshow.Opacity - 0.03;
                if (GridNowshow.Opacity <= 0)
                {
                    GridNowshow.Visibility = Visibility.Hidden;
                    GridReadyshow.Opacity = 0;
                    GridReadyshow.Visibility = Visibility.Visible;

                }
            }
            else
            {
                GridReadyshow.Opacity = GridReadyshow.Opacity + 0.03;
                if (GridReadyshow.Opacity >= 1)
                {
                    GridChangeFlag = false;
                    GridNowshow = GridReadyshow;
                    GridReadyshow = null;
                    (sender as System.Windows.Threading.DispatcherTimer).Stop();
                }
            }
        }

        private void button_Copy_Click(object sender, RoutedEventArgs e)
        {

            if (GridChangeFlag == false)
            {
                mb.Visibility = Visibility.Visible;
                mb1.Visibility = Visibility.Hidden;
                mb2.Visibility = Visibility.Hidden;
                mb3.Visibility = Visibility.Hidden;
                mb4.Visibility = Visibility.Hidden;
                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = maingrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
        }

        private void btncos_Click(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("mod", "off", 0) == 1)
            {
                MessageBox.Show("不能在Mod关闭时进行设置"); return; //
            }
            //if (GetIniInt("mod", "unitchange", 0) == 0)
            //{ MessageBox.Show(mbtext[14]); }
            //else
            //{

            if (GridChangeFlag == false)
            {
                mb.Visibility = Visibility.Hidden;
                mb1.Visibility = Visibility.Hidden;
                mb2.Visibility = Visibility.Hidden;
                mb3.Visibility = Visibility.Visible;
                mb4.Visibility = Visibility.Hidden;
                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = cosgrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
            //}
        }

        private void btnach_Click(object sender, RoutedEventArgs e)
        {

            if (GridChangeFlag == false)
            {
                mb.Visibility = Visibility.Hidden;
                mb1.Visibility = Visibility.Hidden;
                mb2.Visibility = Visibility.Hidden;
                mb3.Visibility = Visibility.Hidden;
                mb4.Visibility = Visibility.Visible;
                //string szTmp;
                //if (GetIniInt("mod", "lang", 0) == 0)
                //{
                //    szTmp = "http://www.tianxiazhengyi.net/downloadc.html";
                //}
                //else
                //{
                //    szTmp = "http://www.tianxiazhengyi.net/downloadc.html";
                //}

                //Uri uri = new Uri(szTmp);
                //achbow.Navigate(uri);

                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = achgrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
        }

        private void button_Copy1_Click_1(object sender, RoutedEventArgs e)
        {
            if (GridChangeFlag == false)
            {
                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = uigrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
        }

        private void setbtn_about_e(object sender, RoutedEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("setp1.png", UriKind.Relative));
            setbgt11.Text = setstringt[0];
            setbgt12.Text = setstringc[0];
        }
        private void setbtn_about_l(object sender, RoutedEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }
        private void setbtn2_e(object sender, RoutedEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set2.png", UriKind.Relative));
            setbgt11.Text = setstringt[1];
            setbgt12.Text = setstringc[1];
        }
        private void setbtn2_l(object sender, RoutedEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }
        private void setbtn3_e(object sender, RoutedEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            TextBlock btn = (TextBlock)sender;
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            if (btn.Name == "setbtn3")
            {
                setbgi.Source = new BitmapImage(new Uri("set7.png", UriKind.Relative));
                setbgt11.Text = setstringt[2];
                setbgt12.Text = setstringc[2];
            }


        }
        private void setbtn3_l(object sender, RoutedEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn5_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set4.png", UriKind.Relative));
            setbgt11.Text = setstringt[4];
            setbgt12.Text = setstringc[4];
        }

        private void setbtn5_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn4_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set1.png", UriKind.Relative));
            setbgt11.Text = setstringt[3];
            setbgt12.Text = setstringc[3];
        }

        private void setbtn4_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn6_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set5.png", UriKind.Relative));
            setbgt11.Text = setstringt[5];
            setbgt12.Text = setstringc[5];
        }

        private void setbtn6_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn7_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("setp7.png", UriKind.Relative));
            setbgt11.Text = setstringt[6];
            setbgt12.Text = setstringc[6];
        }

        private void setbtn7_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn8_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("setp8.png", UriKind.Relative));
            setbgt11.Text = setstringt[7];
            setbgt12.Text = setstringc[7];
        }

        private void setbtn8_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtn9_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set6.png", UriKind.Relative));
            setbgt11.Text = setstringt[8];
            setbgt12.Text = setstringc[8];
        }

        private void setbtn10_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set8.png", UriKind.Relative));
            setbgt11.Text = setstringt[19];
            setbgt12.Text = setstringc[19];
        }

        private void setbtn9_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn1_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui1.png", UriKind.Relative));
            setbgt11.Text = setstringt[9];
            setbgt12.Text = setstringc[9];
        }

        private void uibtn1_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn2_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui2.png", UriKind.Relative));
            setbgt11.Text = setstringt[10];
            setbgt12.Text = setstringc[10];
        }

        private void uibtn2_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn3_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui3.png", UriKind.Relative));
            setbgt11.Text = setstringt[11];
            setbgt12.Text = setstringc[11];
        }

        private void uibtn3_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn4_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui4.png", UriKind.Relative));
            setbgt11.Text = setstringt[12];
            setbgt12.Text = setstringc[12];
        }

        private void uibtn4_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn5_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui5.png", UriKind.Relative));
            setbgt11.Text = setstringt[13];
            setbgt12.Text = setstringc[13];
        }

        private void uibtn5_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtnx_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void setbtnx_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("set3.png", UriKind.Relative));
            setbgt11.Text = setstringt[9];
            setbgt12.Text = setstringc[9];
        }

        private void mainbtn_min_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
            ShowInTaskbar = true;
        }

        private System.Windows.Forms.NotifyIcon notifyIcon = null;
        private void initialTray()
        {
            //隐藏主窗体
            this.Visibility = Visibility.Hidden;
            //设置托盘的各个属性
            notifyIcon = new System.Windows.Forms.NotifyIcon();
            // notifyIcon.BalloonTipText = "淬火MOD已经最小化到托盘";//托盘气泡显示内容
            // notifyIcon.Text = "QuenchingMod";
            notifyIcon.Visible = true;//托盘按钮是否可见
            //重要提示：此处的图标图片在resouces文件夹。可是打包后安装发现无法获取路径，导致程序死机。建议复制一份resouces文件到UI层的bin目录下，确保万无一失。
            Stream iconStream = Application.GetResourceStream(new Uri("pack://application:,,,/1.ico")).Stream;
            notifyIcon.Icon = new System.Drawing.Icon(iconStream);//托盘中显示的图标
            iconStream.Close();
            //notifyIcon.ShowBalloonTip(3);//托盘气泡显示时间
            //双击事件
            //_notifyIcon.MouseDoubleClick += new System.Windows.Forms.MouseEventHandler(notifyIcon_MouseClick);
            //鼠标点击事件
            notifyIcon.MouseClick += new System.Windows.Forms.MouseEventHandler(notifyIcon_MouseClick);
            //右键菜单--退出菜单项
            System.Windows.Forms.MenuItem exit = new System.Windows.Forms.MenuItem("Close");
            // exit.Click += new EventHandler(exit_Click);
            //关联托盘控件
            System.Windows.Forms.MenuItem[] childen = new System.Windows.Forms.MenuItem[] { exit };
            notifyIcon.ContextMenu = new System.Windows.Forms.ContextMenu(childen);
            //窗体状态改变时触发
            this.StateChanged += MainWindow_StateChanged;
        }


        // 托盘图标鼠标单击事件
        private void notifyIcon_MouseClick(object sender, System.Windows.Forms.MouseEventArgs e)
        {
            //鼠标左键，实现窗体最小化隐藏或显示窗体
            if (e.Button == System.Windows.Forms.MouseButtons.Left)
            {
                if (this.Visibility == Visibility.Visible)
                {
                    this.Visibility = Visibility.Hidden;
                    //解决最小化到任务栏可以强行关闭程序的问题。
                    this.ShowInTaskbar = false;//使Form不在任务栏上显示
                }
                else
                {
                    this.Visibility = Visibility.Visible;
                    //解决最小化到任务栏可以强行关闭程序的问题。
                    this.ShowInTaskbar = false;//使Form不在任务栏上显示
                    this.Activate();
                }
            }
            if (e.Button == System.Windows.Forms.MouseButtons.Right)
            {
                //object sender = new object();
                // EventArgs e = new EventArgs();
                exit_Click(sender, e);//触发单击退出事件
            }
        }


        // 窗体状态改变时候触发
        private void SysTray_StateChanged(object sender, EventArgs e)
        {
            if (this.WindowState == WindowState.Minimized)
            {
                this.Visibility = Visibility.Hidden;
            }
        }

        // 退出选项
        private void exit_Click(object sender, EventArgs e)
        {
            //if (System.Windows.MessageBox.Show("确定退出吗?","",MessageBoxButton.YesNo,MessageBoxImage.Question,MessageBoxResult.Yes) == MessageBoxResult.Yes)
            //{
            //System.Windows.Application.Current.Shutdown();
            System.Environment.Exit(0);
            //}
        }


        // 窗口状态改变，最小化托盘
        private void MainWindow_StateChanged(object sender, EventArgs e)
        {
            if (this.WindowState == WindowState.Minimized)
            {
                this.Visibility = Visibility.Hidden;
            }
        }
        public bool trayinit = false;
        public bool mwclose = false;
        private void mainbtn_min_Copy_Click(object sender, RoutedEventArgs e)
        {
            //if (trayinit == false) { initialTray(); trayinit = true; }
            //this.Visibility = Visibility.Hidden;
            mwclose = true;
            this.Close();
        }

        private void button_Copy5_Click(object sender, RoutedEventArgs e)
        {
            if (aboutlic.Visibility == Visibility.Visible) { aboutlic.Visibility = Visibility.Hidden; } else { aboutlic.Visibility = Visibility.Visible; }
        }

        private void button_Copy_Click_1(object sender, RoutedEventArgs e)
        {
            btnclickF(button_Copy1);
            btnclickT(button_Copy);
            btnclickF(button);
            thxlist.Visibility = Visibility.Hidden;
            aboutgrid.Visibility = Visibility.Visible;
            supportgrid.Visibility = Visibility.Hidden;
        }

        private void button_Click_1(object sender, RoutedEventArgs e)
        {
            btnclickF(button_Copy1);
            btnclickF(button_Copy);
            btnclickT(button);
            thxlist.Visibility = Visibility.Hidden;
            aboutgrid.Visibility = Visibility.Hidden;
            supportgrid.Visibility = Visibility.Visible;
        }

        private void button_Copy1_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(button_Copy1);
            btnclickF(button);
            btnclickF(button_Copy);
            thxlist.Visibility = Visibility.Visible;
            aboutgrid.Visibility = Visibility.Hidden;
            supportgrid.Visibility = Visibility.Hidden;
        }

        private void button_Copy2_Click(object sender, RoutedEventArgs e)
        {
            thanks.Visibility = Visibility.Hidden;
        }

        int cosheroflag = 0;
        private void cosbtn1_Copy16_Click(object sender, RoutedEventArgs e)
        {
            cos_hero_pos = cos_hero_pos + 1;
            if (cos_hero_pos > cos_hero_length[cosheroflag, cosheronow - 1])
            { cos_hero_pos = 0; }

            cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
            cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, cosheronow - 1, cos_hero_pos], UriKind.Relative));

            if (cos_hero_pos == cos_hero_now[cosheroflag, cosheronow - 1])
            { btnclickT(cosbtn1_Copy2); }
            else
            { btnclickF(cosbtn1_Copy2); }

        }

        private void cosbtn1_Copy17_Click(object sender, RoutedEventArgs e)
        {
            cos_hero_pos = cos_hero_pos - 1;
            if (cos_hero_pos < 0)
            { cos_hero_pos = cos_hero_length[cosheroflag, cosheronow - 1] - 1; }

            cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
            cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, cosheronow - 1, cos_hero_pos], UriKind.Relative));

            if (cos_hero_pos == cos_hero_now[cosheroflag, cosheronow - 1])
            { btnclickT(cosbtn1_Copy2); }
            else
            { btnclickF(cosbtn1_Copy2); }
        }

        private void cosbtn1_u_Click1(object sender, RoutedEventArgs e)
        {
            cos_unit_pos = cos_unit_pos + 1;
            if (cos_unit_pos >= cos_unit_length[cosunitflag])
            { cos_unit_pos = 0; }

            cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
            cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[cosunitflag, cos_unit_pos], UriKind.Relative));

            if (cos_unit_pos == cos_unit_now[cosunitflag])
            { btnclickT(cosbtn1_u); }
            else
            { btnclickF(cosbtn1_u); }
        }

        private void cosbtn1_u_Click2(object sender, RoutedEventArgs e)
        {
            cos_unit_pos = cos_unit_pos - 1;
            if (cos_unit_pos < 0)
            { cos_unit_pos = cos_unit_length[cosunitflag] - 1; }

            cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
            cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[cosunitflag, cos_unit_pos], UriKind.Relative));

            if (cos_unit_pos == cos_unit_now[cosunitflag])
            { btnclickT(cosbtn1_u); }
            else
            { btnclickF(cosbtn1_u); }
        }

        private void cosbtn1_Click(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            ___nightelf_icon_pressed_png5.Visibility = Visibility.Visible;
            cos_u_or_h = 0;
            cosh.Visibility = Visibility.Visible;
            cosu.Visibility = Visibility.Hidden;
            btnclickT(cosbtn1); btnclickF(cosbtn1_Copy);
            iconhalo1.Visibility = Visibility.Visible;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Hidden;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 0;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 4 * cosheroflag + 1;
                cosimage2.Tag = 4 * cosheroflag + 2;
                cosimage3.Tag = 4 * cosheroflag + 3;
                cosimage4.Tag = 4 * cosheroflag + 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 0;
                cos_unit_pos = cos_unit_now[0];
                cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[0, cos_unit_now[0]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }
        }

        private void cosbtn1_Copy_Click(object sender, RoutedEventArgs e)
        {
            ___nightelf_icon_pressed_png5.Visibility = Visibility.Hidden;
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            cosu.Visibility = Visibility.Visible;
            cosh.Visibility = Visibility.Hidden;
            btnclickF(cosbtn1); btnclickT(cosbtn1_Copy);
            iconhalo1.Visibility = Visibility.Visible;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Hidden;
            cos_u_or_h = 1;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 0;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 4 * cosheroflag + 1;
                cosimage2.Tag = 4 * cosheroflag + 2;
                cosimage3.Tag = 4 * cosheroflag + 3;
                cosimage4.Tag = 4 * cosheroflag + 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 0;
                cos_unit_pos = cos_unit_now[0];
                cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[0, cos_unit_now[0]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }
        }
        public string fileloadingpath;
        public int fileloadflag;

        public void filetemplate()
        {
            this.Dispatcher.Invoke(() =>
            {
                pb.Visibility = Visibility.Visible;
            });
            try
            {
                if (fileloadflag == 0) //开启怀旧
                {
                    try { DelectDir(dir_root + "shaders/vs/"); } catch { }
                    WriteIniInt("mod", "old", 1); WriteIniInt("mod", "melee", 0);
                    oldorsd = 1;
                    //消除对战模式影响
                    try { dirmove(dir_root + "terrainart/blight-dis", dir_root + "terrainart/blight"); } catch { }
                    try { dirmove(dir_root + "terrainart-dis/blight-dis", dir_root + "terrainart-dis/blight"); } catch { }
                    try { dirmove(dir_root + "environment/dncnow", dir_root + "environment/dnc"); } catch { }
                    if (GetIniInt("mod", "light", 0) == 0)
                    {
                        try
                        {
                            DelectDir(dir_root + "environment/dnc");
                            Directory.CreateDirectory(dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                        }
                        catch { }
                    }
                    if (GetIniInt("mod", "light", 0) == 1)
                    {
                        try
                        {
                            DelectDir(dir_root + "environment/dnc");
                            Directory.CreateDirectory(dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                        }
                        catch { }
                    }
                    //
                    if (GetIniInt("set", "trees", 1) == 1) { try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { } }
                    //
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 3; pbtext2.Text = mainstring[9]; });
                    //实际效果
                    try { File.Copy(dir_root + "units/units-old/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./dnc"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                    this.Dispatcher.Invoke(() => {
                        uibtn_unitc.Visibility = Visibility.Visible;
                        setbtn_no6.Visibility = Visibility.Visible;
                        setbtn_no1.Visibility = Visibility.Hidden;
                        //setbtn_no10.Visibility = Visibility.Hidden;
                    });
                }
                if (fileloadflag == 1) //开启对战模式
                {
                    WriteIniInt("mod", "old", 0); WriteIniInt("mod", "melee", 1);
                    //处理怀旧的毒
                    Directory.CreateDirectory(dir_root + "units/units-que/");
                    try { File.Copy(dir_root + "units/units-que/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 3; pbtext2.Text = mainstring[9]; });

                    try
                    {
                        //DelectDir(dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dncashenvale", dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dncdalaran", dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dncdungeon", dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dncfelwood", dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dnclordaeron", dir_root + "environment/dnc");
                        //copyf(dir_root + "environment/dncmelee/dncunderground", dir_root + "environment/dnc");
                    }
                    catch { }

                    try { dirmove(dir_root + "terrainart/blight", dir_root + "terrainart/blight-dis"); } catch { }
                    try { dirmove(dir_root + "terrainart-dis/blight", dir_root + "terrainart-dis/blight-dis"); } catch { }
                    //if (GetIniInt("set", "trees", 1) == 1) { try { File.Copy(dir_root + "units/des-old/destructableskin.txt", dir_root + "units/destructableskin.txt", true); } catch { } }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./dnc"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                    this.Dispatcher.Invoke(() => {
                        uibtn_unitc.Visibility = Visibility.Hidden;
                        setbtn_no6.Visibility = Visibility.Hidden;
                        setbtn_no1.Visibility = Visibility.Visible;
                        //setbtn_no10.Visibility = Visibility.Visible;
                        setbtn_no6.Visibility = Visibility.Visible;
                    });
                }
                if (fileloadflag == 31) //回归普通
                {
                    WriteIniInt("mod", "old", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 3; pbtext2.Text = mainstring[9]; });
                    try { dirmove(dir_root + "terrainart/blight-dis", dir_root + "terrainart/blight"); } catch { }
                    try { dirmove(dir_root + "terrainart-dis/blight-dis", dir_root + "terrainart-dis/blight"); } catch { }
                    try { dirmove(dir_root + "environment/environmentmap", dir_root + "environment/environmentmapmelee"); } catch { }
                    try { dirmove(dir_root + "environment/environmentmapnom", dir_root + "environment/environmentmap"); } catch { }
                    if (GetIniInt("mod", "light", 0) == 0)
                    {
                        try
                        {
                            DelectDir(dir_root + "environment/dnc");
                            Directory.CreateDirectory(dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                        }
                        catch { }
                    }
                    if (GetIniInt("mod", "light", 0) == 1)
                    {
                        try
                        {
                            DelectDir(dir_root + "environment/dnc");
                            Directory.CreateDirectory(dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                            copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                        }
                        catch { }
                    }
                    //
                    if (GetIniInt("set", "trees", 1) == 1) { try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { } }
                    Directory.CreateDirectory(dir_root + "units/units-que/");
                    try { File.Copy(dir_root + "units/units-que/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./dnc"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                    this.Dispatcher.Invoke(() => {
                        uibtn_unitc.Visibility = Visibility.Hidden;
                        setbtn_no6.Visibility = Visibility.Hidden;
                        setbtn_no1.Visibility = Visibility.Hidden;
                        //setbtn_no10.Visibility = Visibility.Hidden;
                        setbtn_no6.Visibility = Visibility.Hidden;
                    });
                }
                if (fileloadflag == 2) //切换经典模式-开发者模式
                {
                    //MessageBox.Show("execSD");
                    this.Dispatcher.Invoke(() => {
                        setbtn_no1.Visibility = Visibility.Visible;
                        setbtn_no2.Visibility = Visibility.Visible;
                        setbtn_no3.Visibility = Visibility.Visible;
                        setbtn_no4.Visibility = Visibility.Visible;
                        setbtn_no5.Visibility = Visibility.Visible;
                        setbtn_no6.Visibility = Visibility.Visible;
                        setbtn_no7.Visibility = Visibility.Visible;
                        //setbtn_no6.Visibility = Visibility.Visible;
                        setbtn_no8.Visibility = Visibility.Visible;
                        setbtn_no9.Visibility = Visibility.Visible;
                        //setbtn_no10.Visibility = Visibility.Visible;
                        uibtn_unitc.Visibility = Visibility.Visible;
                    });
                    //MessageBox.Show("execSD");
                    //this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 16; pbtext2.Text = mainstring[9]; });
                    WriteIniInt("mod", "hdorsd", 0);
                    try { dirmove(dir_root + "buildings", dir_root + "buildings-dis"); } catch { }
                    try { dirmove(dir_root + "units/creeps", dir_root + "units/creeps-dis"); } catch { }
                    try { dirmove(dir_root + "units/critters", dir_root + "units/critters-dis"); } catch { }
                    try { dirmove(dir_root + "units/demon", dir_root + "units/demon-dis"); } catch { }
                    try { dirmove(dir_root + "units/human", dir_root + "units/human-dis"); } catch { }
                    try { dirmove(dir_root + "units/naga", dir_root + "units/naga-dis"); } catch { }
                    try { dirmove(dir_root + "units/nightelf", dir_root + "units/nightelf-dis"); } catch { }
                    try { dirmove(dir_root + "units/orc", dir_root + "units/orc-dis"); } catch { }
                    try { dirmove(dir_root + "units/other", dir_root + "units/other-dis"); } catch { }
                    try { dirmove(dir_root + "units/undead", dir_root + "units/undead-dis"); } catch { }
                    try { dirmove(dir_root + "terrainart", dir_root + "terrainart-dis"); } catch { }
                    try { dirmove(dir_root + "environment", dir_root + "environment-dis"); } catch { }
                    try { dirmove(dir_root + "doodads", dir_root + "doodads-dis"); } catch { }
                    try { File.Delete(dir_root + "units/destructableskin.txt"); } catch { }
                    //try { File.Delete(dir_root + "units/unitskin.txt"); } catch { } } catch { }
                    //try { File.Copy(dir_root + "units/des-old/destructableskin.txt", dir_root + "units/destructableskin.txt",true); } catch { }
                    try { File.Copy(dir_root + "units/units-old/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                    //
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./units"; });
                    try { dirmove(dir_root + "buildings", dir_root + "buildings-dis"); } catch { }
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./buildings"; });
                    try { dirmove(dir_root + "Doodads", dir_root + "Doodads-dis"); } catch { }
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Doodads"; });
                }
                if (fileloadflag == 3) //切换重制版模式
                {
                    WriteIniInt("mod", "hdorsd", 1);
                    //this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 16; pbtext2.Text = mainstring[9]; });
                    //MessageBox.Show("execHD");
                    this.Dispatcher.Invoke(() => {
                        setbtn_no1.Visibility = Visibility.Hidden;
                        setbtn_no2.Visibility = Visibility.Hidden;
                        setbtn_no3.Visibility = Visibility.Hidden;
                        setbtn_no4.Visibility = Visibility.Hidden;
                        setbtn_no6.Visibility = Visibility.Hidden;
                        setbtn_no8.Visibility = Visibility.Hidden;
                        setbtn_no9.Visibility = Visibility.Hidden;
                        setbtn_no5.Visibility = Visibility.Hidden;
                        setbtn_no7.Visibility = Visibility.Hidden;
                        uibtn_unitc.Visibility = Visibility.Hidden;
                    });
                    if (GetIniInt("mod", "melee", 0) == 1)
                    {
                        setbtn_no1.Visibility = Visibility.Visible;
                        //setbtn_no10.Visibility = Visibility.Visible;
                        setbtn_no6.Visibility = Visibility.Visible;
                    }
                    //MessageBox.Show("execHD");

                    try { dirmove(dir_root + "buildings-dis", dir_root + "buildings"); } catch { }
                    try { dirmove(dir_root + "units/creeps-dis", dir_root + "units/creeps"); } catch { }
                    try { dirmove(dir_root + "units/critters-dis", dir_root + "units/critters"); } catch { }
                    try { dirmove(dir_root + "units/demon-dis", dir_root + "units/demon"); } catch { }
                    try { dirmove(dir_root + "units/human-dis", dir_root + "units/human"); } catch { }
                    try { dirmove(dir_root + "units/naga-dis", dir_root + "units/naga"); } catch { }
                    try { dirmove(dir_root + "units/nightelf-dis", dir_root + "units/nightelf"); } catch { }
                    try { dirmove(dir_root + "units/orc-dis", dir_root + "units/orc"); } catch { }
                    try { dirmove(dir_root + "units/other-dis", dir_root + "units/other"); } catch { }
                    try { dirmove(dir_root + "units/undead-dis", dir_root + "units/undead"); } catch { }
                    try { dirmove(dir_root + "terrainart-dis", dir_root + "terrainart"); } catch { }
                    try { dirmove(dir_root + "environment-dis", dir_root + "environment"); } catch { }
                    try { dirmove(dir_root + "doodads-dis", dir_root + "doodads"); } catch { }
                    //try { File.Move(dir_root + "terrainart/destructableskin.txt"); } catch { }
                    //try { File.Delete(dir_root + "units/destructableskin.txt"); } catch { }
                    //try { File.Delete(dir_root + "units/unitskin.txt"); } catch { }
                    try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { }
                    Directory.CreateDirectory(dir_root + "units/units-que/");
                    try { File.Copy(dir_root + "units/units-que/unitskin.txt", dir_root + "units/unitskin.txt", true); } catch { }
                    //
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./units"; });
                    try { dirmove(dir_root + "buildings-dis", dir_root + "buildings"); } catch { }
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./buildings"; });
                    try { dirmove(dir_root + "Doodads-dis", dir_root + "Doodads"); } catch { }
                    //this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Doodads"; });
                }
                if (fileloadflag == 4) //打开反和谐
                {
                    WriteIniInt("mod", "vio", 1);
                    StreamReader sr = new StreamReader("./quenching/vio.que", Encoding.Default);
                    this.Dispatcher.Invoke(() => { pbp.Maximum = 0; });
                    try
                    {
                        while ((sr.ReadLine()) != null)
                        {
                            this.Dispatcher.Invoke(() => { pbp.Maximum = pbp.Maximum + 1; });
                        }

                    }
                    catch { }
                    sr.Close();
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbtext2.Text = mainstring[9]; });
                    string line;
                    StreamReader hr = new StreamReader("./quenching/vio.que", Encoding.Default);
                    try
                    {
                        while ((line = hr.ReadLine()) != null)
                        {
                            this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + line; });
                            try
                            {
                                try { filemove(dir_root + line, dir_root + line + "-unvio"); } catch { }
                                filemove(dir_root + line + "-vio", dir_root + line);
                            }
                            catch { }
                        }
                        hr.Close();
                    }
                    catch { }
                    //copyf("./Quenching/es/units", dir_root);
                    //copyf("./Quenching/es/buildings", dir_root);
                    //copyf("./Quenching/es/abilities", dir_root);
                    //copyf("./Quenching/es/doodads", dir_root);
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 0; });
                }
                if (fileloadflag == 5) //关闭反和谐
                {
                    WriteIniInt("mod", "vio", 0);
                    StreamReader sr = new StreamReader("./quenching/vio.que", Encoding.Default);
                    this.Dispatcher.Invoke(() => { pbp.Maximum = 0; });
                    try
                    {
                        while ((sr.ReadLine()) != null)
                        {
                            this.Dispatcher.Invoke(() => { pbp.Maximum = pbp.Maximum + 1; });
                        }

                    }
                    catch { }
                    sr.Close();
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbtext2.Text = mainstring[9]; });
                    string line;
                    StreamReader hr = new StreamReader("./quenching/vio.que", Encoding.Default);
                    try
                    {
                        while ((line = hr.ReadLine()) != null)
                        {
                            this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + line; });
                            try
                            {
                                try { filemove(dir_root + line, dir_root + line + "-vio"); } catch { }
                                filemove(dir_root + line + "-unvio", dir_root + line);
                            }
                            catch { }
                        }
                        hr.Close();
                    }
                    catch { }
                    //copyf("./Quenching/es/units", dir_root);
                    //copyf("./Quenching/es/buildings", dir_root);
                    //copyf("./Quenching/es/abilities", dir_root);
                    //copyf("./Quenching/es/doodads", dir_root);
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 0; });
                }
                if (fileloadflag == 7) //光照旋转
                {
                    WriteIniInt("mod", "light", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });

                    try
                    {
                        DelectDir(dir_root + "environment/dnc");
                        Directory.CreateDirectory(dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                    }
                    catch { }

                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./dnc"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 6) //光照45
                {
                    WriteIniInt("mod", "light", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        DelectDir(dir_root + "environment/dnc");
                        Directory.CreateDirectory(dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                        copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./dnc"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 8) //打开植被
                {
                    WriteIniInt("mod", "foliage", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "environment/foliage-dis", dir_root + "environment/foliage");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./foliage"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 9) //关闭植被
                {
                    WriteIniInt("mod", "foliage", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "environment/foliage", dir_root + "environment/foliage-dis");
                    //if (GetIniInt("mod", "vio", 1) == 1)
                    //{ dirmove(dir_root + "environment/foliage-dis/blight", dir_root + "environment/foliage/blight"); }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./foliage"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 10) //清澈水面
                {
                    WriteIniInt("mod", "water", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "replaceabletextures/water", dir_root + "replaceabletextures/water-rel");
                    dirmove(dir_root + "replaceabletextures/water-trans", dir_root + "replaceabletextures/water");
                    try
                    {
                        File.Copy(dir_root + "textures/fx/shoreline1.dds", dir_root + "textures/shoreline1.dds", true);
                        File.Copy(dir_root + "textures/fx/shorelineparticlexy.dds", dir_root + "textures/shorelineparticlexy.dds", true);
                        File.Copy(dir_root + "terrainart/terrain-que/water.slk", dir_root + "terrainart/water.slk", true);
                    }
                    catch
                    { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/water"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 11) //反射水面
                {
                    WriteIniInt("mod", "water", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "replaceabletextures/water", dir_root + "replaceabletextures/water-trans");
                    dirmove(dir_root + "replaceabletextures/water-rel", dir_root + "replaceabletextures/water");
                    try
                    {
                        File.Delete(dir_root + "textures/shoreline1.dds");
                        File.Delete(dir_root + "textures/shorelineparticlexy.dds");
                        File.Delete(dir_root + "terrainart/water.slk");
                    }
                    catch
                    { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/water"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 12) //原版UI
                {
                    WriteIniInt("mod", "ui", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try { DelectDir(dir_root + "ui/console"); } catch { }
                    try { DelectDir(dir_root + "ui/feedback"); } catch { }
                    try { DelectDir(dir_root + "ui/framedef"); } catch { }
                    try { copyf(dir_root + "ui/ui-org/feedback", dir_root + "ui"); } catch { }
                    try { File.Delete(dir_root + "shaders/ps/hd.bls"); } catch { }
                    try { File.Copy(dir_root + "shaders/ps/ui-org/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_diffuse.tif", dir_root + "textures/portrait_bg_diffuse.tif-dis"); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_orm.dds", dir_root + "textures/portrait_bg_orm.dds-dis"); } catch { }
                    this.Dispatcher.Invoke(() => {
                        MessageBox.Show(mbtext[51]);
                    });
                    //if (GetIniInt("mod", "camp", 1) == 0) { filemove(dir_root + "ui/campaigninforeforged.txt", dir_root + "ui/campaigninforeforged.txt-dis"); }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/ui/"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 13) //淬火UI
                {
                    WriteIniInt("mod", "ui", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try { DelectDir(dir_root + "ui/console"); } catch { }
                    try { DelectDir(dir_root + "ui/feedback"); } catch { }
                    try { DelectDir(dir_root + "ui/framedef"); } catch { }
                    try { copyf(dir_root + "ui/ui-que/feedback", dir_root + "ui"); } catch { }
                    try { copyf(dir_root + "ui/ui-que/console", dir_root + "ui"); } catch { }
                    try { copyf(dir_root + "ui/ui-que/framedef", dir_root + "ui"); } catch { }
                    try { File.Delete(dir_root + "shaders/ps/hd.bls"); } catch { }
                    try { File.Copy(dir_root + "shaders/ps/ui-que/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_orm.dds-dis", dir_root + "textures/portrait_bg_orm.dds"); } catch { }
                    this.Dispatcher.Invoke(() => {
                        MessageBox.Show(mbtext[51]);
                    });
                    //if (GetIniInt("mod", "camp", 1) == 0) { filemove(dir_root + "ui/campaigninforeforged.txt", dir_root + "ui/campaigninforeforged.txt-dis"); }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/ui/"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 14) //嘉年华UI
                {
                    WriteIniInt("mod", "ui", 2);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try { DelectDir(dir_root + "ui/console"); } catch { }
                    try { DelectDir(dir_root + "ui/feedback"); } catch { }
                    try { DelectDir(dir_root + "ui/framedef"); } catch { }
                    try { copyf(dir_root + "ui/ui-blz/feedback", dir_root + "ui"); } catch { }
                    try { copyf(dir_root + "ui/ui-blz/console", dir_root + "ui"); } catch { }
                    try { copyf(dir_root + "ui/ui-blz/framedef", dir_root + "ui"); } catch { }
                    try { File.Delete(dir_root + "shaders/ps/hd.bls"); } catch { }
                    try { File.Copy(dir_root + "shaders/ps/ui-que/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { }
                    try { filemove(dir_root + "textures/portrait_bg_orm.dds-dis", dir_root + "textures/portrait_bg_orm.dds"); } catch { }
                    this.Dispatcher.Invoke(() => {
                        MessageBox.Show(mbtext[51]);
                    });
                    //if (GetIniInt("mod", "camp", 1) == 0) { filemove(dir_root + "ui/campaigninforeforged.txt", dir_root + "ui/campaigninforeforged.txt-dis"); }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/ui/"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 15) //打开选择圈
                {
                    WriteIniInt("mod", "selection", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "replaceabletextures/selection-dis", dir_root + "replaceabletextures/selection");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 16) //关闭选择圈
                {
                    WriteIniInt("mod", "selection", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "replaceabletextures/selection", dir_root + "replaceabletextures/selection-dis");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 17) //减小光晕
                {
                    WriteIniInt("mod", "hg", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    filemove(dir_root + "textures/fx/flare/heroglow_bw-dis.dds", dir_root + "textures/fx/flare/heroglow_bw.dds");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 18) //增大光晕
                {
                    WriteIniInt("mod", "hg", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    filemove(dir_root + "textures/fx/flare/heroglow_bw.dds", dir_root + "textures/fx/flare/heroglow_bw-dis.dds");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./replaceabletextures/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 19) //打开着色器
                {
                    WriteIniInt("mod", "shader", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    dirmove(dir_root + "shaders-dis", dir_root + "shaders");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./shader"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 20) //关闭着色器
                {
                    WriteIniInt("mod", "shader", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    if (Directory.Exists(dir_root + "shaders-dis")) { Directory.Delete(dir_root + "shaders-dis"); }
                    dirmove(dir_root + "shaders", dir_root + "shaders-dis");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./shader"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 21) //开启战役
                {
                    WriteIniInt("mod", "camp", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    filemove(dir_root + "ui/campaigninforeforged.txt-dis", dir_root + "ui/campaigninforeforged.txt");
                    filemove(dir_root + "webui/campaign/reforged-banner.png-dis", dir_root + "webui/campaign/reforged-banner.png");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + ".webui/campaign/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 22) //关闭战役
                {
                    WriteIniInt("mod", "camp", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    filemove(dir_root + "ui/campaigninforeforged.txt", dir_root + "ui/campaigninforeforged.txt-dis");
                    filemove(dir_root + "webui/campaign/reforged-banner.png", dir_root + "webui/campaign/reforged-banner.png-dis");
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + ".webui/campaign/selection"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 23) //打开单位辨识
                {
                    WriteIniInt("mod", "unitchange", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "buildings-dis", dir_root + "buildings");
                        dirmove(dir_root + "units/creeps-dis", dir_root + "units/creeps");
                        dirmove(dir_root + "units/critters-dis", dir_root + "units/critters");
                        dirmove(dir_root + "units/demon-dis", dir_root + "units/demon");
                        dirmove(dir_root + "units/human-dis", dir_root + "units/human");
                        dirmove(dir_root + "units/naga-dis", dir_root + "units/naga");
                        dirmove(dir_root + "units/nightelf-dis", dir_root + "units/nightelf");
                        dirmove(dir_root + "units/orc-dis", dir_root + "units/orc");
                        dirmove(dir_root + "units/other-dis", dir_root + "units/other");
                        dirmove(dir_root + "units/undead-dis", dir_root + "units/undead");
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 24) //关闭单位辨识
                {
                    WriteIniInt("mod", "unitchange", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "buildings", dir_root + "buildings-dis");
                        dirmove(dir_root + "units/creeps", dir_root + "units/creeps-dis");
                        dirmove(dir_root + "units/critters", dir_root + "units/critters-dis");
                        dirmove(dir_root + "units/demon", dir_root + "units/demon-dis");
                        dirmove(dir_root + "units/human", dir_root + "units/human-dis");
                        dirmove(dir_root + "units/naga", dir_root + "units/naga-dis");
                        dirmove(dir_root + "units/nightelf", dir_root + "units/nightelf-dis");
                        dirmove(dir_root + "units/orc", dir_root + "units/orc-dis");
                        dirmove(dir_root + "units/other", dir_root + "units/other-dis");
                        dirmove(dir_root + "units/undead", dir_root + "units/undead-dis");
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 25) //打开半身像
                {
                    WriteIniInt("mod", "half", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 200; pbtext2.Text = mainstring[9]; });
                    string line;
                    StreamReader hr = new StreamReader("./Quenching/half.que", Encoding.Default);
                    try
                    {
                        while ((line = hr.ReadLine()) != null)
                        {
                            if (File.Exists(dir_root + line + "-half"))
                            {
                                try { filemove(dir_root + line, dir_root + line + "-nom"); } catch { }
                                try
                                {
                                    filemove(dir_root + line + "-half", dir_root + line);
                                }
                                catch { }
                                this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + line; });
                            }
                        }
                        hr.Close();
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = 200; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                    hr.Close();
                }
                if (fileloadflag == 26) //关闭半身像
                {
                    WriteIniInt("mod", "half", 0);
                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 200; pbtext2.Text = mainstring[9]; });
                    string line;
                    StreamReader hr = new StreamReader("./Quenching/half.que", Encoding.Default);
                    try
                    {
                        while ((line = hr.ReadLine()) != null)
                        {
                            if (File.Exists(dir_root + line))
                            {
                                try { filemove(dir_root + line, dir_root + line + "-half"); } catch { }
                                try
                                {
                                    filemove(dir_root + line + "-nom", dir_root + line);
                                }
                                catch { }
                                this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + line; });
                            }
                        }
                        hr.Close();
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = 200; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                    hr.Close();
                }
                if (fileloadflag == 27) //打开装饰物
                {

                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "Doodads-dis", dir_root + "Doodads");
                        try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { }
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 28) //关闭装饰物
                {

                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "Doodads", dir_root + "Doodads-dis");
                        try { streamname("destructableskin-org.txt", dir_root + "units/destructableskin.txt"); } catch { }
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 29) //打开地形
                {

                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "terrainart-dis", dir_root + "terrainart");
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
                if (fileloadflag == 30) //关闭地形
                {

                    this.Dispatcher.Invoke(() => { pbp.Value = 0; pbp.Maximum = 2; pbtext2.Text = mainstring[9]; });
                    try
                    {
                        dirmove(dir_root + "terrainart", dir_root + "terrainart-dis");
                    }
                    catch { }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + "./Quenching/units"; });
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
                }
            }
            catch { }
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; });
        }


        public int dlogtrig = 0;


        private void uibtnsm1_Copy_Click(object sender, RoutedEventArgs e)
        {
            isHookEnable = true;
            WriteIniInt("mod", "key", 1);
            uikey.Visibility = Visibility.Visible;

            btnclickT(uibtnsm1_Copy);
            btnclickF(uibtnsm2_Copy1);
        }

        private void uibtnsm2_Copy1_Click(object sender, RoutedEventArgs e)
        {
            isHookEnable = false;
            WriteIniInt("mod", "key", 0);

            uikey.Visibility = Visibility.Hidden;
            btnclickF(uibtnsm1_Copy);
            btnclickT(uibtnsm2_Copy1);
        }

        private void uibtnsm1_Copy2_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("mod", "ad", 1);

            try { File.Move(dir_root + "scripts/blizzard.j-dis", dir_root + "scripts/blizzard.j"); } catch { }
            btnclickT(setbtnc9_Copy);
            btnclickF(setbtnc10_Copy);
        }

        private void uibtnsm2_Copy2_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("mod", "ad", 0);

            try { File.Move(dir_root + "scripts/blizzard.j", dir_root + "scripts/blizzard.j-dis"); } catch { }
            btnclickF(setbtnc9_Copy);
            btnclickT(setbtnc10_Copy);
        }

        private void setbtnc1_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            //btnclickT(setbtnc1);
            //btnclickF(setbtnc2);
            fileloadflag = 23;
            WriteIniInt("mod", "unitchange", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc2_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            //btnclickF(setbtnc1);
            //btnclickT(setbtnc2);
            fileloadflag = 24;
            WriteIniInt("mod", "unitchange", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        //private void setbtnc1c_Click(object sender, RoutedEventArgs e)
        //{
        //    if (oldorsd == 1) { Console.WriteLine("cant use"); MessageBox.Show(mbtext[27]); return; }
        //    btnclickT(setbtnc1_Copy1);
        //    btnclickF(setbtnc2_Copy1);
        //    fileloadflag = 29;
        //    WriteIniInt("set", "tile", 1);
        //    Thread thread = new Thread(new ThreadStart(filetemplate));
        //    thread.Start();
        //}

        //private void setbtnc2c_Click(object sender, RoutedEventArgs e)
        //{
        //    if (oldorsd == 1) { Console.WriteLine("cant use"); MessageBox.Show(mbtext[27]); return; }
        //    btnclickF(setbtnc1_Copy1);
        //    btnclickT(setbtnc2_Copy1);
        //    fileloadflag = 30;
        //    WriteIniInt("set", "tile", 0);
        //    Thread thread = new Thread(new ThreadStart(filetemplate));
        //    thread.Start();
        //}

        private void setbtn_tile_origin(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { Console.WriteLine("cant use"); MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            WriteIniInt("set", "trees", 0);
            try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { }
        }

        private void setbtn_tile_16(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tile_18(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tile_20(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tile_00(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickF(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tree_origin(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { Console.WriteLine("cant use"); MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            WriteIniInt("set", "trees", 0);
            try { streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt"); } catch { }
        }

        private void setbtn_tree_16(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tree_18(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tree_20(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_tree_20_short(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickF(setbtn_tree_b1);
            btnclickF(setbtn_tree_b2);
            btnclickF(setbtn_tree_b3);
            btnclickF(setbtn_tree_b4);
            fileloadflag = 28;
            WriteIniInt("set", "trees", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc3_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("set", "vio", 1);
            if (System.Windows.MessageBox.Show(mbtext[40], "", MessageBoxButton.YesNo, MessageBoxImage.Question, MessageBoxResult.Yes) == MessageBoxResult.Yes)
            {
                Thread thread = new Thread(new ThreadStart(anitvio));
                thread.Start();
            }
        }

        private void setbtnc5_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(setbtnc5);
            btnclickF(setbtnc6);
            fileloadflag = 10;
            WriteIniInt("mod", "water", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc6_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(setbtnc5);
            btnclickT(setbtnc6);
            fileloadflag = 11;
            WriteIniInt("mod", "water", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc7_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtnc7);
            btnclickF(setbtnc8);
            fileloadflag = 8;
            WriteIniInt("mod", "foliage", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc8_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickF(setbtnc7);
            btnclickT(setbtnc8);
            fileloadflag = 9;
            WriteIniInt("mod", "foliage", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc9_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(setbtnc9);
            btnclickF(setbtnc10);
            fileloadflag = 19;
            WriteIniInt("mod", "shader", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc10_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(setbtnc9);
            btnclickT(setbtnc10);
            fileloadflag = 20;
            WriteIniInt("mod", "shader", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc11_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickT(setbtnc11);
            btnclickF(setbtnc12);
            fileloadflag = 6;
            WriteIniInt("mod", "light", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtnc12_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            btnclickF(setbtnc11);
            btnclickT(setbtnc12);
            fileloadflag = 7;
            WriteIniInt("mod", "light", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtn1_Click(object sender, RoutedEventArgs e)
        {
            if (uibtn1.Tag == null)
            {
                btnclickT(uibtn1); btnclickF(uibtn2); btnclickF(uibtn3); uibtn1.Tag = ""; uibtn2.Tag = null; uibtn3.Tag = null;
                fileloadflag = 12;
                WriteIniInt("mod", "ui", 0);
                Thread thread = new Thread(new ThreadStart(filetemplate));
                thread.Start();
            }
        }

        private void uibtn2_Click(object sender, RoutedEventArgs e)
        {
            if (uibtn2.Tag == null)
            {
                btnclickT(uibtn2); btnclickF(uibtn1); btnclickF(uibtn3); uibtn2.Tag = ""; uibtn1.Tag = null; uibtn3.Tag = null;
                fileloadflag = 13;
                WriteIniInt("mod", "ui", 1);
                Thread thread = new Thread(new ThreadStart(filetemplate));
                thread.Start();
            }
        }

        private void uibtn3_Click(object sender, RoutedEventArgs e)
        {
            if (uibtn3.Tag == null)
            {
                btnclickT(uibtn3); btnclickF(uibtn2); btnclickF(uibtn1); uibtn3.Tag = ""; uibtn2.Tag = null; uibtn1.Tag = null;
                fileloadflag = 14;
                WriteIniInt("mod", "ui", 2);
                Thread thread = new Thread(new ThreadStart(filetemplate));
                thread.Start();
            }
        }

        private void uibtnsm1_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(uibtnsm1);
            btnclickF(uibtnsm2);
            fileloadflag = 17;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtnsm2_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(uibtnsm1);
            btnclickT(uibtnsm2);
            fileloadflag = 18;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtnsm3_Click(object sender, RoutedEventArgs e)
        {
            //btnclickT(uibtnsm3);
            //btnclickF(uibtnsm4);
            fileloadflag = 15;
            WriteIniInt("mod", "selection", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtnsm4_Click(object sender, RoutedEventArgs e)
        {
            //btnclickT(uibtnsm4);
            //btnclickF(uibtnsm3);
            fileloadflag = 16;
            WriteIniInt("mod", "selection", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void achbtn1_Copy5_Click(object sender, RoutedEventArgs e)
        {
            achtext.Visibility = Visibility.Visible;

            Button btn = (Button)sender;
            int i = Convert.ToInt32(btn.Tag.ToString());
            if (achbool[i] == true)
            {
                achdt1.Text = achstring1[i];
                achdt2.Text = achstring2[i];
                achdt3.Text = achstring3[i];
                iachdir.Source = new BitmapImage(new Uri(achstring4[i], UriKind.Relative));
            }
            else
            {
                achdt1.Text = achstring1[i];
                achdt2.Text = achstring2[i];
                achdt3.Text = achstring3[i];
                iachdir.Source = new BitmapImage(new Uri("btnbg.png", UriKind.Relative));
            }

        }

        private void achbtnmian_MouseEnter(object sender, RoutedEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            Button btn = (Button)sender;
            int i = Convert.ToInt32(btn.Tag.ToString());
            if (achbool[i] == true)
            {
                //achmaint1.Text = achstring1[i];
                //achmaint2.Text = achstring2[i];
            }
            else
            {
                //achmaint1.Text = mbtext[5];
                //achmaint2.Text = mbtext[6];
            }
        }
        private void achbtnmian_MouseLeave(object sender, RoutedEventArgs e)
        {
            Button btn = (Button)sender;
            //achmaint1.Text = mbtext[7];
            //achmaint2.Text = mbtext[8];
        }

        private void achdi1_Click(object sender, RoutedEventArgs e)
        {
            achtext.Visibility = Visibility.Hidden;
        }

        private void achbtnsm1_Copy_Click(object sender, RoutedEventArgs e)
        {
            //btnclickT(achbtc1);
            //btnclickF(achbtc2);
            fileloadflag = 21;
            WriteIniInt("mod", "camp", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void achbtnsm2_Copy1_Click(object sender, RoutedEventArgs e)
        {
            //btnclickT(achbtc2);
            //btnclickF(achbtc1);
            fileloadflag = 22;
            WriteIniInt("mod", "camp", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }


        private void achbtn2_MouseEnter_1(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            achshow.Visibility = Visibility.Visible;
            achshowi.Source = new BitmapImage(new Uri("ach1.jpg", UriKind.Relative));
            achshowt1.Text = setstringt[15];
            achshowt2.Text = setstringc[15];
        }

        private void achbtn3_MouseLeave(object sender, MouseEventArgs e)
        {
            achshow.Visibility = Visibility.Hidden;
        }

        private void achbtn3_MouseEnter_1(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            achshow.Visibility = Visibility.Visible;
            achshowi.Source = new BitmapImage(new Uri("ach2.jpg", UriKind.Relative));
            achshowt1.Text = setstringt[16];
            achshowt2.Text = setstringc[16];
        }

        private void achbtn2_MouseLeave(object sender, MouseEventArgs e)
        {
            achshow.Visibility = Visibility.Hidden;
        }
        private void mainbtn_qu_Click(object sender, RoutedEventArgs e)
        {
            thanks.Visibility = Visibility.Visible;
        }
        public int cosheronow = 1;
        private void cosi_MouseDown(object sender, MouseButtonEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck2.mp3", UriKind.Relative));
            player.Play();
            Image btn = (Image)sender;
            cosheronow = Convert.ToInt32(btn.Tag.ToString());
            int i = cosheronow - 1;
            cos_hero_pos = cos_hero_now[cosheroflag, i];
            Console.WriteLine(cosheroflag);
            Console.WriteLine(cosheronow);
            Console.WriteLine(cos_hero_now[cosheroflag, cosheronow]);
            cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, i, cos_hero_now[cosheroflag, i]], UriKind.Relative));
            cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
        }
        public void cosherostate(string i1, string i2)
        {
            if (cosheronow != 2 && cosheronow != 5 || cospage == 0)
            { cospage = 0; cosc1.Content = cosunitstring[2]; }
            if (i2 == "none")
            {
                btnclickT(cosc1);
                btnclickF(cosc2);
            }
            else
            {
                if (oldorsd == 0)
                {
                    if (GetIniInt("coshero", i1, 1) == 1)
                    { btnclickT(cosc1); Console.WriteLine(1); }
                    else
                    { btnclickF(cosc1); }

                    if (GetIniInt("coshero", (Convert.ToInt32(i1) + 1).ToString(), 0) == 1)
                    { btnclickT(cosc2); Console.WriteLine(2); }
                    else
                    { btnclickF(cosc2); }

                    if (GetIniInt("coshero", (Convert.ToInt32(i1) + 2).ToString(), 0) == 1)
                    { btnclickT(cosc3); Console.WriteLine(3); }
                    else
                    { btnclickF(cosc3); }

                    if (GetIniInt("coshero", (Convert.ToInt32(i1) + 3).ToString(), 0) == 1)
                    { btnclickT(cosc4); Console.WriteLine(4); }
                    else
                    { btnclickF(cosc4); }

                    if (cospage == 1)
                    {
                        if (GetIniInt("coshero", (Convert.ToInt32(i1) + 4).ToString(), 0) == 1)
                        { btnclickT(cosc1); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc1); }

                        if (GetIniInt("coshero", (Convert.ToInt32(i1) + 5).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc2); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc2); }

                        if (GetIniInt("coshero", (Convert.ToInt32(i1) + 6).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc3); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc3); }

                        if (GetIniInt("coshero", (Convert.ToInt32(i1) + 7).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc4); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc4); }
                    }


                }
                else
                {
                    if (GetIniInt("cosheroold", i1, 1) == 1)
                    { btnclickT(cosc1); Console.WriteLine(1); }
                    else
                    { btnclickF(cosc1); }

                    if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 1).ToString(), 0) == 1)
                    { btnclickT(cosc2); Console.WriteLine(2); }
                    else
                    { btnclickF(cosc2); }

                    if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 2).ToString(), 0) == 1)
                    { btnclickT(cosc3); Console.WriteLine(3); }
                    else
                    { btnclickF(cosc3); }

                    if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 3).ToString(), 0) == 1)
                    { btnclickT(cosc4); Console.WriteLine(4); }
                    else
                    { btnclickF(cosc4); }

                    if (cospage == 1)
                    {
                        if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 4).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc1); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc1); }

                        if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 5).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc2); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc2); }

                        if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 6).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc3); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc3); }

                        if (GetIniInt("cosheroold", (Convert.ToInt32(i1) + 7).ToString(), 0) == 1 && cospage == 1)
                        { btnclickT(cosc4); Console.WriteLine(4); }
                        else
                        { btnclickF(cosc4); }
                    }
                }
            }

        }
        public string cosunitpic = "cosunitorc0.png";
        public string cosunits1;
        public string cosunits2;
        public int cosunitpage = 2;
        private void cuoldbtn_MouseEnter(object sender, MouseEventArgs e)
        {
            cosuniti.Source = new BitmapImage(new Uri("cosold.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[6]; cosunitt2.Text = cosunitstring[7];
        }

        private void cuoldbtn_MouseLeave(object sender, MouseEventArgs e)
        {
            cosuniti.Source = new BitmapImage(new Uri(cosunitpic, UriKind.Relative));
            cosunitt1.Text = cosunits1;
            cosunitt2.Text = cosunits2;

        }
        private void cubtn1_MouseEnter(object sender, MouseEventArgs e)
        {
            Button btn = (Button)sender;
            int i = Convert.ToInt32(btn.Tag.ToString());
            if (i == 1 && cosunitpage == 2)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunitorc0.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3]; return; ;
            }
            if (i == 2 && cosunitpage == 2)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunitorc1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[4]; cosunitt2.Text = cosunitstring[5]; return;

            }
            if (i == 3 && cosunitpage == 2)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunitorc2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[16]; cosunitt2.Text = cosunitstring[17]; return;

            }
            if (i == 1 && cosunitpage == 1)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunithum0.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3]; return; ;
            }
            if (i == 2 && cosunitpage == 1)
            {

                cosuniti.Source = new BitmapImage(new Uri("cosunithum1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[8]; cosunitt2.Text = cosunitstring[9];
                return;
            }
            if (i == 3 && cosunitpage == 1)
            {

                cosuniti.Source = new BitmapImage(new Uri("cosunithum2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[14]; cosunitt2.Text = cosunitstring[15];
                return;
            }
            if (i == 1 && cosunitpage == 3)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunitud0.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3]; return; ;
            }
            if (i == 2 && cosunitpage == 3)
            {

                cosuniti.Source = new BitmapImage(new Uri("cosunitud1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[10]; cosunitt2.Text = cosunitstring[11];
                return;
            }
            if (i == 3 && cosunitpage == 3)
            {

                cosuniti.Source = new BitmapImage(new Uri("cosunitud2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[18]; cosunitt2.Text = cosunitstring[19];
                return;
            }
            if (i == 1 && cosunitpage == 4)
            {
                cosuniti.Source = new BitmapImage(new Uri("cosunitne0.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3]; return; ;
            }
            if (i == 2 && cosunitpage == 4)
            {

                cosuniti.Source = new BitmapImage(new Uri("cosunitne1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[12]; cosunitt2.Text = cosunitstring[13];
                return;
            }
            cosuniti.Source = new BitmapImage(new Uri("cosunitnone.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[0]; cosunitt2.Text = cosunitstring[1];
        }
        //todo 二位数组
        private void cosbtn1_Copy11_Click(object sender, RoutedEventArgs e)
        {
            Button btn = (Button)sender;
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }

            int i = cos_unit_pos + 1;
            if (!Directory.Exists(dir_root + "units/")) { Directory.CreateDirectory(dir_root + "units/"); }
            if (!File.Exists(dir_root + "units/unitskin.txt"))
            {
                if (oldorsd == 0)
                { streamname("unitskin-new.txt", dir_root + "units/unitskin.txt"); }
                else
                { streamname("unitskin.txt", dir_root + "units/unitskin.txt"); }
            }

            if (true)
            {

                btnclickT(cosbtn1_u);
                cos_unit_now[cosunitflag] = i - 1;
                if (i == 2 && cosunitflag == 3)
                {
                    try
                    {

                        cosuniti.Source = new BitmapImage(new Uri("cosu_n2.png", UriKind.Relative));
                        WriteIniInt("cosunit", "3", 1);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4832] = @"file=units\nightelf\Shandris\Shandris";
                        lines[4885] = @"file=cos\ne1\Ballista.mdx";
                        lines[5635] = @"file=units\NightElf\Naisha\Naisha";
                        lines[5529] = @"file=cos\ne1\RiddenHippogryph";
                        lines[5472] = @"file=cos\ne1\Hippogryph";
                        lines[5580] = @"file=cos\ne1\MG";
                        //lines[5574] = @"Art=ReplaceableTextures\CommandButtons\BTNMountainGiant.blp";//ReplaceableTextures\CommandButtons\BTNWarGolem.blp
                        //lines[5580] = @"file=units\creeps\guardiangolem\guardiangolem.mdx";
                        lines[5574] = @"Art=replaceabletextures\commandbuttons\btnguardiangolem.dds";//ReplaceableTextures\CommandButtons\BTNWarGolem.blp
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 1 && cosunitflag == 3)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_n1.png", UriKind.Relative));
                        WriteIniInt("cosunit", "3", 0);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4832] = @"file=units\nightelf\Archer\Archer";
                        lines[4885] = @"file=units\nightelf\Ballista\Ballista";
                        lines[5635] = @"file=units\nightelf\Huntress\Huntress";
                        lines[5529] = @"file=units\nightelf\RiddenHippogryph\RiddenHippogryph";
                        lines[5472] = @"file=units\nightelf\Hippogryph\Hippogryph";
                        lines[5580] = @"file=units\nightelf\MountainGiant\MountainGiant";
                        lines[5574] = @"Art=ReplaceableTextures\CommandButtons\BTNMountainGiant.blp";//ReplaceableTextures\CommandButtons\BTNWarGolem.blp
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 2 && cosunitflag == 2)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_u2.png", UriKind.Relative));
                        WriteIniInt("cosunit", "2", 1);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[7081] = @"file=cos\ud1\CryptFiend";
                        lines[7408] = @"file=units\undead\sapphironundead\sapphironundead";
                        lines[7452] = @"modelScale:hd=0.65";
                        lines[7724] = @"file=cos\ud1\revenantfrost";
                        lines[7716] = @"Art=ReplaceableTextures\CommandButtons\BTNFrostRevenant.blp";
                        lines[7768] = @"modelScale:hd=1.05";
                        lines[6921] = @"file=cos\ud1\bansheewraith";
                        lines[6965] = @"modelScale:hd=0.77";
                        lines[6808] = @"Art=ReplaceableTextures\CommandButtons\BTNFleshGolem.blp";
                        lines[6815] = @"file=units\other\FleshGolem\FleshGolem.mdl";
                        lines[6859] = @"modelScale:hd=0.75";
                        lines[6913] = @"Art=ReplaceableTextures\CommandButtons\BTNWraith.blp";
                        lines[7399] = @"Art=ReplaceableTextures\CommandButtons\BTNSapphironUndead.blp";

                        lines[7922] = @"Art=ReplaceableTextures\CommandButtons\BTNSkeletonWarrior.blp";
                        lines[7926] = @"file=units\undead\Skeleton\Skeleton";
                        lines[7928] = @"unitSound=Skeleton";

                        lines[7972] = @"Art=ReplaceableTextures\CommandButtons\BTNSkeletonMage.blp";
                        lines[7976] = @"file=units\undead\SkeletonMage\SkeletonMage";
                        lines[7978] = @"unitSound=Skeleton";

                        lines[7669] = @"file=units\undead\MeatWagon\MeatWagon";

                        lines[7507] = @"Art=ReplaceableTextures\CommandButtons\BTNGhoul.blp";
                        lines[7515] = @"file=units\undead\Ghoul\Ghoul";
                        lines[7517] = @"unitSound=Ghoul";


                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 1 && cosunitflag == 2)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_u1.png", UriKind.Relative));
                        WriteIniInt("cosunit", "2", 0);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[7081] = @"file=units\undead\CryptFiend\CryptFiend";
                        lines[7408] = @"file=units\undead\FrostWyrm\FrostWyrm";
                        lines[7452] = @"modelScale:hd=0.85";
                        lines[7724] = @"file=units\undead\Necromancer\Necromancer";
                        lines[7716] = @"Art=ReplaceableTextures\CommandButtons\BTNNecromancer.blp";
                        lines[7768] = @"modelScale:hd=0.95";
                        lines[6921] = @"file=units\undead\Banshee\Banshee";
                        lines[6965] = @"modelScale:hd=0.95";
                        lines[6815] = @"file=units\undead\Abomination\Abomination";
                        lines[6859] = @"modelScale:hd=1.1";
                        lines[6808] = @"Art=ReplaceableTextures\CommandButtons\BTNAbomination.blp";
                        lines[6913] = @"Art=ReplaceableTextures\CommandButtons\BTNWraith.blp";
                        lines[7399] = @"Art=ReplaceableTextures\CommandButtons\BTNSapphironUndead.blp";

                        lines[7922] = @"Art=ReplaceableTextures\CommandButtons\BTNSkeletonWarrior.blp";
                        lines[7926] = @"file=units\undead\Skeleton\Skeleton";
                        lines[7928] = @"unitSound=Skeleton";

                        lines[7972] = @"Art=ReplaceableTextures\CommandButtons\BTNSkeletonMage.blp";
                        lines[7976] = @"file=units\undead\SkeletonMage\SkeletonMage";
                        lines[7978] = @"unitSound=Skeleton";

                        lines[7669] = @"file=units\undead\MeatWagon\MeatWagon";

                        lines[7507] = @"Art=ReplaceableTextures\CommandButtons\BTNGhoul.blp";
                        lines[7515] = @"file=units\undead\Ghoul\Ghoul";
                        lines[7517] = @"unitSound=Ghoul";

                        lines[6815] = @"file=units\undead\Abomination\Abomination";

                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 3 && cosunitflag == 2)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_u3.png", UriKind.Relative));
                        WriteIniInt("cosunit", "2", 2);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[7081] = @"file=units\undead\CryptFiend\CryptFiend";
                        lines[7408] = @"file=units\undead\FrostWyrm\FrostWyrm";
                        lines[7452] = @"modelScale:hd=0.85";

                        lines[7768] = @"modelScale:hd=0.95";
                        lines[6921] = @"file=units\undead\Banshee\Banshee";
                        lines[6965] = @"modelScale:hd=0.95";
                        lines[6815] = @"file=units\undead\Abomination\Abomination";
                        lines[6859] = @"modelScale:hd=1.1";
                        lines[6808] = @"Art=ReplaceableTextures\CommandButtons\BTNAbomination.blp";
                        lines[6913] = @"Art=ReplaceableTextures\CommandButtons\BTNWraith.blp";
                        lines[7399] = @"Art=ReplaceableTextures\CommandButtons\BTNSapphironUndead.blp";

                        lines[7922] = @"Art=ReplaceableTextures\CommandButtons\BTNZombie.blp";
                        lines[7926] = @"file=units\creeps\Zombie\Zombie";
                        lines[7928] = @"unitSound=Zombie";

                        lines[7972] = @"Art=ReplaceableTextures\CommandButtons\BTNZombieFemale.blp";
                        lines[7976] = @"file=units\Creeps\ZombieFemale\ZombieFemale";
                        lines[7978] = @"unitSound=Zombie";

                        lines[7669] = @"file=cos\ud2\2";

                        lines[7507] = @"Art=ReplaceableTextures\CommandButtons\BTNud2.blp";
                        lines[7515] = @"file=cos\ud2\3";

                        lines[7724] = @"file=units\Undead\Deceiver\Deceiver";
                        lines[7716] = @"Art=ReplaceableTextures\CommandButtons\BTNDeceiver.blp";

                        lines[6815] = @"file=cos\ud2\1";

                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 3 && cosunitflag == 0)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_h3.png", UriKind.Relative));
                        WriteIniInt("cosunit", "0", 2);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[437] = @"file=units\Human\HighElfSwordsman\HighElfSwordsman_v1.mdl";
                        lines[602] = @"file=cos\hum2\BloodElfKnight";
                        lines[1141] = @"file=cos\hum2\Sorceress";

                        lines[1131] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNSorceressV1.blp";

                        lines[819] = @"file=units\human\WarWagon\WarWagon";
                        lines[820] = @"fileVerFlags=2";

                        lines[710] = @"file=cos\hum2\highelfrunner.mdx";
                        lines[754] = @"modelScale:hd=1";

                        lines[703] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNChaplain.blp";

                        lines[1024] = @"Art=ReplaceableTextures\CommandButtons\BTNRifleman.blp";
                        lines[1031] = @"file=units\human\Rifleman\Rifleman";

                        lines[866] = @"Art=ReplaceableTextures\CommandButtons\BTNElfVillager.blp";
                        lines[874] = @"file=units\critters\HighElfPeasant\HighElfPeasant";
                        lines[876] = @"unitSound=BloodElfEngineer";


                        lines[649] = @"Art=ReplaceableTextures\CommandButtons\BTNBloodElfPeasant.blp";
                        lines[654] = @"file=cos\hum2\BloodElfEngineer.mdl";
                        lines[656] = @"unitSound=BloodElfEngineer";

                        lines[596] = @"Art=ReplaceableTextures\CommandButtons\BTNBloodElfLieutenant.blp";//Art=ReplaceableTextures\CommandButtons\BTNKnight.blp
                        lines[430] = @"Art=ReplaceableTextures\CommandButtons\BTNSwordsman.blp";//ReplaceableTextures\CommandButtons\BTNFootman.blp
                        lines[439] = @"unitSound=HighElfSwordsman";//unitSound=Footman
                        lines[604] = @"unitSound=ElfWizard";//Knight

                        lines[711] = @"fileVerFlags=0";
                        lines[703] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNPriestV1.blp";
                        lines[646] = @"modelScale:hd=1.07";

                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 2 && cosunitflag == 0)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_h2.png", UriKind.Relative));
                        WriteIniInt("cosunit", "0", 1);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[437] = @"file=cos\hum1\footman";

                        lines[602] = @"file=cos\hum1\Knight";

                        lines[1141] = @"file=cos\hum1\IsakariMystic";

                        lines[819] = @"file=Units\Creeps\WarCart\WarCart";
                        lines[820] = @"fileVerFlags=0";

                        lines[710] = @"file=Units\Creeps\Chaplain\Chaplain";


                        lines[1024] = @"Art=ReplaceableTextures\CommandButtons\BTNHMv2.blp";
                        lines[1031] = @"file=cos\hum1\HMv6";

                        lines[866] = @"Art=ReplaceableTextures\CommandButtons\BTNPeasant.blp";
                        lines[874] = @"file=units\human\Peasant\Peasant";
                        lines[876] = @"unitSound=Peasant";


                        lines[649] = @"Art=ReplaceableTextures\CommandButtons\BTNMilitia.blp";
                        lines[654] = @"file=units\human\Militia\Militia";
                        lines[656] = @"unitSound=Militia";

                        lines[596] = @"Art=ReplaceableTextures\CommandButtons\BTNKnight.blp";//Art=ReplaceableTextures\CommandButtons\BTNKnight.blp
                        lines[430] = @"Art=ReplaceableTextures\CommandButtons\BTNFootman.blp";//ReplaceableTextures\CommandButtons\BTNFootman.blp
                        lines[439] = @"unitSound=Footman";//unitSound=Footman
                        lines[604] = @"unitSound=Knight";//Knight

                        lines[1131] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNSW.blp";

                        lines[711] = @"fileVerFlags=0";
                        lines[754] = @"modelScale:hd=1";
                        lines[703] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNChaplain.blp";
                        lines[646] = @"modelScale:hd=1";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 1 && cosunitflag == 0)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_h1.png", UriKind.Relative));
                        WriteIniInt("cosunit", "0", 0);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[437] = @"file=units\human\Footman\footman";
                        lines[602] = @"file=units\human\Knight\Knight";
                        lines[1141] = @"file=units\human\Sorceress\Sorceress";
                        lines[819] = @"file=units\human\WarWagon\WarWagon";
                        lines[820] = @"fileVerFlags=2";
                        lines[710] = @"file=units\human\Priest\Priest";
                        lines[754] = @"modelScale:hd=1.1";
                        lines[703] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNPriestV1.blp";
                        lines[1024] = @"Art=ReplaceableTextures\CommandButtons\BTNRifleman.blp";
                        lines[1031] = @"file=units\human\Rifleman\Rifleman";

                        lines[866] = @"Art=ReplaceableTextures\CommandButtons\BTNPeasant.blp";
                        lines[874] = @"file=units\human\Peasant\Peasant";
                        lines[876] = @"unitSound=Peasant";

                        lines[649] = @"Art=ReplaceableTextures\CommandButtons\BTNMilitia.blp";
                        lines[654] = @"file=units\human\Militia\Militia";
                        lines[656] = @"unitSound=Militia";

                        lines[596] = @"Art=ReplaceableTextures\CommandButtons\BTNKnight.blp";//Art=ReplaceableTextures\CommandButtons\BTNKnight.blp
                        lines[430] = @"Art=ReplaceableTextures\CommandButtons\BTNFootman.blp";//ReplaceableTextures\CommandButtons\BTNFootman.blp
                        lines[439] = @"unitSound=Footman";//unitSound=Footman
                        lines[604] = @"unitSound=Knight";//Knight

                        lines[1131] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNSorceress.blp";

                        lines[711] = @"fileVerFlags=2";
                        lines[703] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNPriest.blp";
                        lines[646] = @"modelScale:hd=1.0";

                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 2 && cosunitflag == 0)
                {
                    try
                    {
                        cosuniti.Source = new BitmapImage(new Uri("cosu_o2.png", UriKind.Relative));
                        WriteIniInt("cosunit", "1", 1);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2757] = @"file=cos\orc1\grunt";
                        lines[2914] = @"file=cos\orc1\KotoBeast";
                        lines[3020] = @"file=cos\orc1\WolfRider";
                        lines[3075] = @"file=cos\orc1\shaman";
                        lines[3831] = @"file=cos\orc1\WyvernRider";
                        lines[2545] = @"file=cos\orc1\catapult.mdl";
                        lines[2576] = @"modelScale=1.25";
                        lines[2801] = @"modelScale:hd=1.05";
                        lines[3064] = @"modelScale:hd=0.97";
                        lines[2749] = @"Art=ReplaceableTextures\CommandButtons\BTNGrunt.blp";

                        lines[2906] = @"Art=ReplaceableTextures\CommandButtons\BTNKotoBeast.blp";


                        lines[3013] = @"Art=ReplaceableTextures\CommandButtons\BTNRaider.blp";

                        lines[3067] = @"Art=ReplaceableTextures\CommandButtons\BTNShaman.blp";
                        lines[2961] = @"file=units\orc\Peon\Peon";
                        lines[2966] = @"Art=ReplaceableTextures\CommandButtons\BTNPeon.blp";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 1 && cosunitflag == 1)
                {
                    try
                    {
                        WriteIniInt("cosunit", "1", 0);
                        cosuniti.Source = new BitmapImage(new Uri("cosu_o1.png", UriKind.Relative));
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2757] = @"file=units\orc\grunt\grunt";
                        lines[2914] = @"file=units\orc\KotoBeast\KotoBeast";
                        lines[3020] = @"file=units\orc\WolfRider\WolfRider";
                        lines[3075] = @"file=units\orc\shaman\shaman";
                        lines[3831] = @"file=units\orc\WyvernRider\WyvernRider";
                        lines[2545] = @"file=units\orc\catapult\catapult";

                        lines[2749] = @"Art=ReplaceableTextures\CommandButtons\BTNGrunt.blp";

                        lines[2906] = @"Art=ReplaceableTextures\CommandButtons\BTNKotoBeast.blp";

                        lines[3013] = @"Art=ReplaceableTextures\CommandButtons\BTNRaider.blp";

                        lines[3067] = @"Art=ReplaceableTextures\CommandButtons\BTNShaman.blp";
                        lines[2961] = @"file=units\orc\Peon\Peon";
                        lines[2966] = @"Art=ReplaceableTextures\CommandButtons\BTNPeon.blp";

                        lines[2576] = @"modelScale=1";
                        lines[2801] = @"modelScale:hd=1";
                        lines[3064] = @"modelScale:hd=0.97";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                if (i == 3 && cosunitflag == 1)
                {
                    try
                    {
                        WriteIniInt("cosunit", "1", 2);
                        cosuniti.Source = new BitmapImage(new Uri("cosu_o3.png", UriKind.Relative));
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2757] = @"file=units\demon\chaosgrunt\chaosgrunt.mdx";
                        lines[2749] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosGrunt.blp";
                        lines[2914] = @"file=units\demon\chaoskotobeast\chaoskotobeast.mdx";
                        lines[2906] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosKotoBeast.blp";
                        lines[3020] = @"file=units\demon\chaoswolfrider\chaoswolfrider.mdx";
                        lines[3013] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosWolfRider.blp";
                        lines[3075] = @"file=units\demon\chaoswarlock\chaoswarlock.mdx";
                        lines[3067] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosWarlock.blp";
                        lines[2961] = @"file=units\demon\chaospeon\chaospeon.mdx";
                        lines[2966] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosPeon.blp";

                        lines[2576] = @"modelScale=1";
                        lines[2801] = @"modelScale:hd=1";
                        lines[3064] = @"modelScale:hd=0.94";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                    }
                    catch { }
                }
                Directory.CreateDirectory(dir_root + "units/units-que/");
                File.Copy(dir_root + "units/unitskin.txt", dir_root + "units/units-que/unitskin.txt", true);
            }
        }

        private void cosc1_Click(object sender, RoutedEventArgs e)
        {
            //Console.WriteLine("fafa");
            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            Button btn = (Button)sender;
            int i = cos_hero_pos + 1;
            int herotemp = 4 * cosheroflag + cosheronow;
            if (!Directory.Exists(dir_root + "units/")) { Directory.CreateDirectory(dir_root + "units/"); }
            if (!File.Exists(dir_root + "units/unitskin.txt"))
            {
                if (oldorsd == 0)
                { streamname("unitskin-new.txt", dir_root + "units/unitskin.txt"); }
                else
                { streamname("unitskin.txt", dir_root + "units/unitskin.txt"); }
            }
            try
            {
                if (oldorsd == 0)
                {

                    if (herotemp == 1 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8] = @"file=units\human\Jaina\Jaina";
                        lines[5] = @"modelScale:hd=1.35";
                        lines[60] = @"modelScale:hd=1.1";
                        lines[1] = @"Art=ReplaceableTextures\CommandButtons\BTNJaina.blp";
                        lines[10] = @"unitSound=Jaina";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 1 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8] = @"file=units\human\HeroArchMage\HeroArchMage";
                        lines[5] = @"modelScale:hd=1.05";
                        lines[1] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroArchMage.blp";
                        lines[10] = @"unitSound=HeroArchMage";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 1 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8] = @"file=Units\Human\Antonidas\Antonidas";
                        lines[5] = @"modelScale:hd=1.05";
                        lines[1] = @"Art=ReplaceableTextures\CommandButtons\BTNAntonidas.blp";
                        lines[10] = @"unitSound=HeroArchMage";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 1 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8] = @"file=Units\Other\HighElfArchMage\HighElfArchMage";
                        lines[5] = @"modelScale:hd=1.05";
                        lines[1] = @"Art=ReplaceableTextures\CommandButtons\BTNHighElfArchMage.blp";
                        lines[10] = @"unitSound=HeroArchMage";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\Uther\Uther";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNUther.blp";
                        lines[178] = @"unitSound=Uther";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\HeroPaladin\HeroPaladin";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroPaladin.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\Arthas\Arthas";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNArthas.blp";
                        lines[178] = @"unitSound=Arthas";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\ArthaswithSword\ArthaswithSword";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNArthasFrost.blp";
                        lines[178] = @"unitSound=Arthas";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 5)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\HeroPaladinBoss\HeroPaladinBoss";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNLordNicholasBuzan.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 8)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\Human\HeroHalahk\HeroHalahk";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNHalahkTheLifeBringer.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 7)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\Human\HeroMagroth\HeroMagroth";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNMagrothTheDefender.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 9)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\human\HeroPaladinBoss2\HeroPaladinBoss2";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNSirGregoryEdmunson.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 6)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\Human\HeroDagren\HeroDagren";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNDagrenTheOrcSlayer.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 2 && i == 10)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[176] = @"file=units\other\Proudmoore\Proudmoore";
                        lines[173] = @"modelScale:hd=1.3";
                        lines[169] = @"Art=ReplaceableTextures\CommandButtons\BTNProudMoore.blp";
                        lines[178] = @"unitSound=HeroPaladin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;

                    }
                    if (herotemp == 3 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[123] = @"file=units\human\Muradin\Muradin";
                        lines[120] = @"modelScale:hd=1.2";
                        lines[116] = @"Art=ReplaceableTextures\CommandButtons\BTNMuradinBronzeBeard.blp";
                        lines[125] = @"unitSound=Muradin";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 3 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[123] = @"file=units\human\HeroMountainKing\HeroMountainKing";
                        lines[120] = @"modelScale:hd=1.3";
                        lines[116] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroMountainKing.blp";
                        lines[125] = @"unitSound=HeroMountainKing";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 3 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[123] = @"file=cos\DarkIronCaptain\DarkIronCaptain";
                        lines[120] = @"modelScale:hd=1.3";
                        lines[116] = @"Art=ReplaceableTextures\CommandButtons\BTNDarkIronCaptain";
                        lines[125] = @"unitSound=HeroMountainKing";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 4 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[70] = @"file=units\human\Kael\Kael";
                        lines[67] = @"modelScale:hd=1.2";
                        lines[63] = @"Art=ReplaceableTextures\CommandButtons\BTNBloodMage2.blp";
                        lines[72] = @"unitSound=Kael";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 4 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[70] = @"file=units\human\HeroBloodElf\HeroBloodElf";
                        lines[67] = @"modelScale:hd=1.2";
                        lines[63] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroBloodElfPrince.blp";
                        lines[72] = @"unitSound=BloodElfSorceror";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }

                    if (herotemp == 5 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=Units\Orc\Samuro\Samuro";
                        lines[2219] = @"modelScale:hd=1.08";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\BTNSamuro.blp";
                        lines[2224] = @"unitSound=HeroBladeMaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 5)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=units\demon\HeroChaosBladeMaster\HeroChaosBladeMaster";
                        lines[2219] = @"modelScale:hd=1.08";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosBlademaster.blp";
                        lines[2224] = @"unitSound=HeroBladeMaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 6)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=cos\DranaiAkama";
                        lines[2219] = @"modelScale:hd=1.15";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\BTNDranaiAkama.blp";
                        lines[2224] = @"unitSound=Akama";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 7)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=cos\kargath\kargath_green";
                        lines[2219] = @"modelScale:hd=1.15";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\btnkargathgreen";
                        lines[2224] = @"unitSound=Grom";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=units\demon\ChaosHellscream\ChaosHellscream";
                        lines[2219] = @"modelScale:hd=1.05";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\BTNChaosGrom.blp";
                        lines[2224] = @"unitSound=Grom";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=units\orc\Hellscream\Hellscream";
                        lines[2219] = @"modelScale:hd=1.08";
                        lines[2215] = @"Art=ReplaceableTextures\CommandButtons\BTNHellScream.blp";
                        lines[2224] = @"unitSound=Grom";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 5 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2222] = @"file=units\orc\heroblademaster\heroblademaster";
                        lines[2219] = @"modelScale:hd=1.06";
                        lines[2215] = @"Art=replaceabletextures\commandbuttons\btnheroblademaster.blp";
                        lines[2224] = @"unitSound=HeroBladeMaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 6 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2284] = @"file=units\orc\Thrall\Thrall";
                        lines[2281] = @"modelScale:hd=1.02";
                        lines[2277] = @"Art=ReplaceableTextures\CommandButtons\BTNThrall.blp";
                        lines[2286] = @"unitSound=Thrall";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 6 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2284] = @"file=units\orc\HeroFarSeer\HeroFarSeer";
                        lines[2281] = @"modelScale:hd=1.02";
                        lines[2277] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroFarseer.blp";
                        lines[2286] = @"unitSound=HeroFarSeer";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 6 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2284] = @"file=Units\Orc\DrekThar\DrekThar";
                        lines[2281] = @"modelScale:hd=1.02";
                        lines[2277] = @"Art=ReplaceableTextures\CommandButtons\BTNDrekThar.blp";
                        lines[2286] = @"unitSound=HeroFarSeer";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 6 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2284] = @"file=units\orc\OrcWarlockGuldan\OrcWarlockGuldan";
                        lines[2281] = @"modelScale:hd=1.2";
                        lines[2277] = @"Art=ReplaceableTextures\CommandButtons\BTNGuldan.blp";
                        lines[2286] = @"unitSound=HeroFarSeer";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 8 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2337] = @"file=Units\Orc\Rokhan\Rokhan";
                        lines[2334] = @"modelScale:hd=1.05";
                        lines[2330] = @"Art=ReplaceableTextures\CommandButtons\BTNRokhan.blp";
                        lines[2339] = @"unitSound=Rokhan";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 8 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2337] = @"file=units\Orc\VolJin\VolJin";
                        lines[2334] = @"modelScale:hd=1.15";
                        lines[2330] = @"Art=ReplaceableTextures\CommandButtons\BTNVoljin.blp";
                        lines[2339] = @"unitSound=WitchDoctor";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 8 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2337] = @"file=units\orc\HeroShadowHunter\HeroShadowHunter";
                        lines[2334] = @"modelScale:hd=1.05";
                        lines[2330] = @"Art=ReplaceableTextures\CommandButtons\BTNShadowHunter.blp";
                        lines[2339] = @"unitSound=HeroShadowHunter";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 7 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2391] = @"file=units\orc\HeroTaurenChieftainCIN\HeroTaurenChieftainCIN";
                        lines[2388] = @"modelScale:hd=1.05";
                        lines[2384] = @"Art=ReplaceableTextures\CommandButtons\BTNCairneBloodhoof.blp";
                        lines[2393] = @"unitSound=Cairne";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 7 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[2391] = @"file=units\orc\HeroTaurenChieftain\HeroTaurenChieftain";
                        lines[2388] = @"modelScale:hd=1.05";
                        lines[2384] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroTaurenChieftain.blp";
                        lines[2393] = @"unitSound=HeroTaurenChieftain";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 9 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6635] = @"file:hd=cos\TheLichKing.mdx";
                        lines[6631] = @"modelScale:hd=1.3";
                        //lines[6687] = @"modelScale:hd=1.05";
                        lines[6627] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNTheLichKing.blp";
                        lines[6637] = @"unitSound=EvilArthas";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 9 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6635] = @"file:hd=Units\Undead\EvilArthas\UndeadArthas";
                        lines[6631] = @"modelScale:hd=1.05";
                        lines[6627] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNArthasEvil.blp";
                        lines[6637] = @"unitSound=HeroDeathKnight";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 9 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6635] = @"file:hd=cos\DeathKnightMounted\Death_Knight_Mount";
                        lines[6631] = @"modelScale:hd=1.05";
                        lines[6627] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNDeathknightMounted.dds";
                        lines[6637] = @"unitSound=HeroDeathKnight";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 10 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt"); lines[6761] = @"fileVerFlags=2";
                        lines[6760] = @"file=Units\undead\HeroLichCIN\HeroLichCIN";
                        lines[6804] = @"modelScale:hd=1.01";
                        lines[6754] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNLichVersion2.blp";
                        lines[6762] = @"unitSound=KelThuzadLich";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 10 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6760] = @"file=cos\SylvanasBanshee.mdx";
                        lines[6804] = @"modelScale:hd=1.2";
                        lines[6754] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNSylvanasGhost.blp";
                        lines[6761] = @"fileVerFlags=0";
                        lines[6762] = @"unitSound=EvilSylvanas";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 10 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt"); lines[6761] = @"fileVerFlags=2";
                        lines[6760] = @"file=units\undead\HeroLich\HeroLich";
                        lines[6804] = @"modelScale:hd=0.97";
                        lines[6754] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNHeroLich.blp";
                        lines[6762] = @"unitSound=HeroLich";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=Units\Undead\Detheroc\Detheroc";
                        lines[6749] = @"modelScale:hd=1.06";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNDetheroc.blp";
                        lines[6707] = @"unitSound=HeroDreadLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=units\undead\HeroDreadLord\HeroDreadLord";
                        lines[6749] = @"modelScale:hd=1.15";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroDreadLord.blp";
                        lines[6707] = @"unitSound=HeroDreadLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=units\undead\Tichondrius\Tichondrius";
                        lines[6749] = @"modelScale:hd=1.08";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNTichondrius.blp";
                        lines[6707] = @"unitSound=Tichondrius";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=Units\Undead\Varimathras\Varimathras";
                        lines[6749] = @"modelScale:hd=1.15";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNVarimathras.blp";
                        lines[6707] = @"unitSound=Varimathras";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 5)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=units\Undead\Balnazzar\Balnazzar";
                        lines[6749] = @"modelScale:hd=1.05";
                        lines[6699] = @"ReplaceableTextures\CommandButtons\BTNBalnazzar.blp";
                        lines[6707] = @"unitSound=Varimathras";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 6)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=units\Undead\MalGanis\MalGanis";
                        lines[6749] = @"modelScale:hd=1.15";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNMalGanis.blp";
                        lines[6707] = @"unitSound=Tichondrius";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 11 && i == 7)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6705] = @"file=Units\Undead\Varimathras\Varimathras";
                        lines[6749] = @"modelScale:hd=1.15";
                        lines[6699] = @"Art=ReplaceableTextures\CommandButtons\BTNVarimathras.blp";
                        lines[6707] = @"unitSound=Tichondrius";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 12 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6579] = @"file=units\undead\Anubarak\Anubarak";
                        lines[6623] = @"modelScale:hd=1.04";
                        lines[6573] = @"Art=ReplaceableTextures\CommandButtons\BTNAnubarak.blp";
                        lines[6581] = @"unitSound=HeroCryptLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 12 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[6579] = @"file=units\undead\HeroCryptLord\HeroCryptLord";
                        lines[6623] = @"modelScale:hd=1.04";
                        lines[6573] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroCryptLord.blp";
                        lines[6581] = @"unitSound=HeroCryptLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 13 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4725] = @"file=Units\NightElf\Tyrande\Tyrande";
                        lines[4722] = @"modelScale:hd=1.05";
                        lines[4718] = @"Art=ReplaceableTextures\CommandButtons\BTNTyrande.blp";
                        lines[4727] = @"unitSound=Tyrande";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 13 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4725] = @"file=cos\TyrandeDismounted\TyrandeMountless";
                        lines[4722] = @"modelScale:hd=1.17";
                        lines[4718] = @"Art=ReplaceableTextures\CommandButtons\BTNTyrande.blp";
                        lines[4727] = @"unitSound=Tyrande";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 13 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4725] = @"file=units\nightelf\HeroMoonPriestess\HeroMoonPriestess";
                        lines[4722] = @"modelScale:hd=1.05";
                        lines[4718] = @"Art=ReplaceableTextures\CommandButtons\BTNPriestessOfTheMoon.blp";
                        lines[4727] = @"unitSound=HeroMoonPriestess";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 14 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4672] = @"file=units\nightelf\MalFurion\MalFurion";
                        lines[4669] = @"modelScale:hd=1.06";
                        lines[4665] = @"Art=ReplaceableTextures\CommandButtons\BTNFurion.blp";
                        lines[4674] = @"unitSound=Furion";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 14 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4672] = @"file=units\nightelf\HeroKeeperoftheGrove\HeroKeeperoftheGrove";
                        lines[4669] = @"modelScale:hd=1.06";
                        lines[4665] = @"Art=ReplaceableTextures\CommandButtons\BTNKeeperOfTheGrove.blp";
                        lines[4674] = @"unitSound=HeroKeeperoftheGrove";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 14 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4672] = @"file=Units\NightElf\Cenarius\Cenarius";
                        lines[4669] = @"modelScale:hd=0.9";
                        lines[4665] = @"Art=ReplaceableTextures\CommandButtons\BTNCenarius.blp";
                        lines[4674] = @"unitSound=HeroKeeperoftheGrove";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 15 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4533] = @"file:hd=units\nightelf\EvilIllidan\IllidanEvil";
                        lines[4528] = @"modelScale:hd=1.12";
                        lines[4524] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNEvilIllidan.blp";
                        lines[4535] = @"unitSound=EvilIllidan";

                        lines[4599] = @"file:hd=units\nightelf\EvilIllidan\IllidanEvil";
                        lines[4595] = @"modelScale:hd=1.25";
                        lines[4591] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNMetamorphosis.blp";
                        lines[4601] = @"unitSound=EvilIllidanMorphed";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 15 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4533] = @"file:hd=Units\NightElf\Illidan\Illidan";
                        lines[4528] = @"modelScale:hd=1.16";
                        lines[4524] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNIllidan.blp";
                        lines[4535] = @"unitSound=HeroDemonHunter";

                        lines[4599] = @"file:hd=Units\NightElf\Illidan\Illidan";
                        lines[4595] = @"modelScale:hd=1.25";
                        lines[4591] = @"Art:hd=ReplaceableTextures\CommandButtons\BTNIllidanDemonForm.blp";
                        lines[4601] = @"unitSound=HeroDemonHunterMorphed";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 16 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4778] = @"file=units\nightelf\Maiev\Maiev";
                        lines[4776] = @"modelScale:hd=1.2";
                        lines[4771] = @"Art=ReplaceableTextures\CommandButtons\BTNWarden2.blp";
                        lines[4780] = @"unitSound=Maiev";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 16 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4778] = @"file=cos\mv\Maiev";
                        lines[4776] = @"modelScale:hd=1.2";
                        lines[4771] = @"Art=ReplaceableTextures\CommandButtons\BTNmv.blp";
                        lines[4780] = @"unitSound=Maiev";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 16 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[4778] = @"file=units\nightelf\herowarden\herowarden";
                        lines[4776] = @"modelScale:hd=1.2";
                        lines[4771] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroWarden.blp";
                        lines[4780] = @"unitSound=HeroWarden";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 17 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8912] = @"file=Units\Creeps\Beastmaster\Beastmaster";
                        lines[8909] = @"modelScale:hd=1.2";
                        lines[8905] = @"Art=ReplaceableTextures\CommandButtons\BTNBeastMaster.blp";
                        lines[8914] = @"unitSound=Beastmaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 17 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8912] = @"file=Units\Other\Rexxar\Rexxar";
                        lines[8909] = @"modelScale:hd=1.2";
                        lines[8905] = @"Art=ReplaceableTextures\CommandButtons\BTNRexxar.blp";
                        lines[8914] = @"unitSound=Beastmaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 18 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8860] = @"file=Units\Undead\EvilSylvanas\EvilSylvanas";
                        lines[8857] = @"modelScale:hd=1.3";
                        lines[8853] = @"Art=ReplaceableTextures\CommandButtons\BTNSylvanas.blp";
                        lines[8862] = @"unitSound=EvilSylvanas";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 18 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8860] = @"file=units\Other\JennallaDeemspring\JennallaDeemspring";
                        lines[8857] = @"modelScale:hd=1.23";
                        lines[8853] = @"Art=ReplaceableTextures\CommandButtons\BTNJennallaDeemspring.blp";
                        lines[8862] = @"unitSound=Sylvanus";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 18 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8860] = @"file=units\creeps\SylvanusWindrunner\SylvanusWindrunner";
                        lines[8857] = @"modelScale:hd=1.3";
                        lines[8853] = @"Art=ReplaceableTextures\CommandButtons\BTNSylvanusWindrunner.blp";
                        lines[8862] = @"unitSound=Sylvanus";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 18 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8860] = @"file=Units\Creeps\BansheeRanger\BansheeRanger";
                        lines[8857] = @"modelScale:hd=1.35";
                        lines[8853] = @"Art=ReplaceableTextures\CommandButtons\BTNBansheeRanger.blp";
                        lines[8862] = @"unitSound=DarkRanger";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 19 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8964] = @"file=units\naga\LadyVashj\LadyVashj";
                        lines[8961] = @"modelScale:hd=1.05";
                        lines[8957] = @"Art=ReplaceableTextures\CommandButtons\BTNLadyVashj.blp";
                        lines[8966] = @"unitSound=SeaWitch";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 19 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[8964] = @"file=units\naga\HeroNagaSeawitch\HeroNagaSeawitch";
                        lines[8961] = @"modelScale:hd=1.05";
                        lines[8957] = @"Art=ReplaceableTextures\CommandButtons\BTNNagaSeaWitch.blp";
                        lines[8966] = @"unitSound=SeaWitch";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 20 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9069] = @"file=Units\Creeps\HeroGoblinAlchemist\HeroGoblinAlchemist";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 20 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9069] = @"file=cos\GAOrigin\HeroGoblinAlchemist";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 21 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9017] = @"file=Units\Creeps\ChenStormstout\ChenStormstout";
                        lines[9014] = @"modelScale:hd=1.17";
                        lines[9010] = @"Art=ReplaceableTextures\CommandButtons\BTNChenStormstout.blp";
                        lines[9019] = @"unitSound=PandarenBrewmaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }

                    if (herotemp == 21 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9017] = @"file=Units\Creeps\PandarenBrewmaster\PandarenBrewmaster";
                        lines[9014] = @"modelScale:hd=1.2";
                        lines[9010] = @"Art=ReplaceableTextures\CommandButtons\BTNPandarenBrewmaster.blp";
                        lines[9019] = @"unitSound=PandarenBrewmaster";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 22 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9811] = @"file=cos/volcanus.mdx";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 22 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9811] = @"file=units\Creeps\HeroFlameLord\HeroFlameLord"; ;
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 23 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9284] = @"file=Units\Creeps\HeroTinkerGazlowe\HeroTinkerGazlowe";
                        lines[9281] = @"modelScale:hd=1.12";
                        lines[9277] = @"Art=ReplaceableTextures\CommandButtons\BTNEngineerGazlowe.blp";
                        lines[9286] = @"unitSound=HeroTinker";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 23 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9284] = @"file=Units\Creeps\HeroTinker\HeroTinker";
                        lines[9281] = @"modelScale:hd=1.15";
                        lines[9277] = @"Art=ReplaceableTextures\CommandButtons\BTNHeroTinker.blp";
                        lines[9286] = @"unitSound=HeroTinker";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 24 && i == 3)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9759] = @"file=units\demon\PitLord\PitLord";
                        lines[9756] = @"modelScale:hd=1.06";
                        lines[9752] = @"Art=ReplaceableTextures\CommandButtons\BTNAzgalor.blp";
                        lines[9761] = @"unitSound=PitLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 24 && i == 1)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9759] = @"file=units\demon\HeroPitLord\HeroPitLord";
                        lines[9756] = @"modelScale:hd=1.05";
                        lines[9752] = @"Art=ReplaceableTextures\CommandButtons\BTNPitLord.blp";
                        lines[9761] = @"unitSound=HeroPitLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 24 && i == 4)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9759] = @"file=units\demon\Mannoroth\Mannoroth";
                        lines[9756] = @"modelScale:hd=1.05";
                        lines[9752] = @"Art=ReplaceableTextures\CommandButtons\BTNMannoroth.blp";
                        lines[9761] = @"unitSound=HeroPitLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (herotemp == 24 && i == 2)
                    {
                        btnclickT(btn);
                        string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                        lines[9759] = @"file=Units\Demon\Magtheridon\Magtheridon";
                        lines[9756] = @"modelScale:hd=1.1";
                        lines[9752] = @"Art=ReplaceableTextures\CommandButtons\BTNMagtheridon.blp";
                        lines[9761] = @"unitSound=HeroPitLord";
                        File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                        WriteIniInt("coshero", herotemp.ToString(), i);
                        cos_hero_now[cosheroflag, cosheronow - 1] = i - 1;
                    }
                    if (!Directory.Exists(dir_root + "units/units-que/")) { Directory.CreateDirectory(dir_root + "units/units-que/"); }
                    File.Copy(dir_root + "units/unitskin.txt", dir_root + "units/units-que/unitskin.txt", true);
                }
            }
            catch
            { MessageBox.Show(mbtext[26]); }


        }

        private void oldbtn1_Click(object sender, RoutedEventArgs e)
        {
            fileloadflag = 1;
            oldmode.Visibility = Visibility.Hidden;
            uibtn_unitc.Visibility = Visibility.Hidden;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtn5_Copy_Click(object sender, RoutedEventArgs e)
        {

        }

        private void uibtn6_MouseLeave(object sender, MouseEventArgs e)
        {
            setshowcasegrid.Visibility = Visibility.Hidden;
        }

        private void uibtn6_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            setshowcasegrid.Visibility = Visibility.Visible;
            setbgi.Source = new BitmapImage(new Uri("ui6.png", UriKind.Relative));
            setbgt11.Text = setstringt[14];
            setbgt12.Text = setstringc[14];
        }

        private void uibtnsm5_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }

            if (GetIniInt("mod", "unitchange", 0) == 0)
            { MessageBox.Show(mbtext[14]); return; }
            btnclickT(uibtnsm5);
            btnclickF(uibtnsm6);
            fileloadflag = 25;
            WriteIniInt("mod", "half", 1);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void uibtnsm6_Click(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1) { MessageBox.Show(mbtext[27]); return; }
            if (GetIniInt("mod", "unitchange", 0) == 0)
            { MessageBox.Show(mbtext[14]); }
            btnclickT(uibtnsm6);
            btnclickF(uibtnsm5);
            fileloadflag = 26;
            WriteIniInt("mod", "half", 0);
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void mainbtn_check_Click(object sender, RoutedEventArgs e)
        {
            //try { System.Diagnostics.Process.Start(mbtext[25]); } catch { }
            if (GetIniInt("mod", "lockc", 0) == 1) { MessageBox.Show("安装前请先锁定重制版"); }
            if (GetIniInt("mod", "off", 0) == 1) { MessageBox.Show("安装前请先打开MOD"); }

            if (File.Exists(dir_root + "patch/keep.que"))
            {
                if (DownloadFile(fseverurl + "versionkeep.que", "./quenching/versionkeep.que"))
                {
                    string[] vk = File.ReadAllLines("./quenching/versionkeep.que");
                    string[] lk = File.ReadAllLines(dir_root + "patch/keep.que");
                    for (int i = 0; i < vk.Length; i++)
                    {
                        try
                        {
                            if (vk[i] != lk[i])
                            {
                                if (System.Windows.Forms.MessageBox.Show(mbtext[33], "", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
                                {
                                    downloadversion = 1;
                                    //lockhd

                                    //
                                    Thread thread = new Thread(new ThreadStart(maincheckfile));
                                    thread.Start();
                                    return;
                                }
                            }
                            //else
                            //{ MessageBox.Show(mbtext[48]); return; }
                        }
                        catch
                        { }
                    }
                    MessageBox.Show(mainstring[5]);
                    return;
                }
                else
                { MessageBox.Show(mainstring[2]); }

            }
            else
            {
                if (File.Exists("./QMF2.2.zip"))
                {
                    quezipfile = "./QMF2.2.zip";
                    try
                    {
                        Console.WriteLine("has");
                        zipmaxint = 3000;
                        Thread thread = new Thread(new ThreadStart(unZipFile));
                        thread.Start();
                        return;

                    }
                    catch
                    { MessageBox.Show(mbtext[21]); }
                }
                else
                {
                    downloadversion = 1;
                    try
                    {
                        DelectDir(dir_root + "war3campImported");
                        DelectDir(dir_root + "music");
                        DelectDir(dir_root + "sound");
                        DelectDir(dir_root + "campaign");
                        DelectDir(dir_root + "abilities");
                        DelectDir(dir_root + "objects");
                        DelectDir(dir_root + "sharedfx");
                        DelectDir(dir_root + "sharedmodels");
                        DelectDir(dir_root + "units");
                        DelectDir(dir_root + "ui");
                        DelectDir(dir_root + "webui");
                        DelectDir(dir_root + "cos");
                        DelectDir(dir_root + "es");
                        DelectDir(dir_root + "scripts");
                        DelectDir(dir_root + "textures");
                        DelectDir(dir_root + "terrainart");
                        DelectDir(dir_root + "replaceabletextures");
                        DelectDir(dir_root + "shaders");
                        DelectDir(dir_root + "splats");
                        DelectDir(dir_root + "doodads");
                        DelectDir(dir_root + "buildings");
                        DelectDir(dir_root + "environment");
                        DelectDir(dir_root + "qc");
                        DelectDir(dir_root + "movies");
                    }
                    catch
                    { MessageBox.Show(mbtext[21]); }
                    Thread thread = new Thread(new ThreadStart(maincheckfile));
                    thread.Start();
                }
            }
        }
        private void mainbtn_check_Click1(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dialog = new OpenFileDialog();
            dialog.Multiselect = true;//该值确定是否可以选择多个文件
            dialog.Title = mbtext[35];
            dialog.Filter = "zip Files (*.zip)|*.zip;";
            if (dialog.ShowDialog() == true)
            {

                quezipfile = dialog.FileName;
                try
                {
                    zipmaxint = 1500;
                    Thread thread = new Thread(new ThreadStart(unZipFile));
                    thread.Start();

                }
                catch
                { MessageBox.Show(mbtext[21]); }

            }

        }

        private void mainbtn_about_Click(object sender, RoutedEventArgs e)
        {
            thanks.Visibility = Visibility.Visible;
            btnclickF(button_Copy1);
            btnclickT(button_Copy);
            btnclickF(button);
        }

        private void mainbtn_reset_Click(object sender, RoutedEventArgs e)
        {

        }
        private void mainbtn_check_Click_1(object sender, RoutedEventArgs e)
        {
            checkupdate();
        }

        public int supportpage = 0;
        public string[] supporttext = new string[15];

        private void button1_Click(object sender, RoutedEventArgs e)
        {
            supportpage--;
            if (supportpage < 0) { supportpage = 6; }
            thxtt1.Text = supporttext[supportpage];
            textBlock4.Text = (supportpage + 1).ToString();
        }
        private void button1_Copy_Click(object sender, RoutedEventArgs e)
        {
            supportpage++;
            if (supportpage > 6) { supportpage = 0; }
            thxtt1.Text = supporttext[supportpage];
            textBlock4.Text = (supportpage + 1).ToString();
        }

        private void button3_Click(object sender, RoutedEventArgs e)
        {
            update.Visibility = Visibility.Hidden;
        }

        private void mainbtn_update_Click(object sender, RoutedEventArgs e)
        {
            //update.Visibility = Visibility.Visible;
            try { System.Diagnostics.Process.Start(mbtext[28]); }
            catch { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/"); }
        }

        private void mainbtn_un_Click(object sender, RoutedEventArgs e)
        {
            update.Visibility = Visibility.Visible;
        }

        private void button2_Click(object sender, RoutedEventArgs e)
        {
            Process myprocess = new Process();
            ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -uid w3");
            //-launch -uid w3\
            //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
            myprocess.StartInfo = startInfo;
            myprocess.StartInfo.UseShellExecute = false;
            myprocess.Start();
        }
        public bool initc = false;

        public bool keyc_shift = false;
        public int keyc_hero = 0;
        public int keyc_mode = 0;
        private void uibtn2_Copy2_Click(object sender, RoutedEventArgs e)
        {
            if (keyc_shift) { btnclickF(uibtn2_Copy2); keyc_shift = false; WriteIniInt("key", "shift", 0); }
            else { btnclickT(uibtn2_Copy2); keyc_shift = true; WriteIniInt("key", "shift", 1); }
        }

        private void uibtn2_Copy_Click(object sender, RoutedEventArgs e)
        {
            keyc_mode = 0; WriteIniInt("key", "mode", 0);
            btnclickF(uibtn2_Copy); btnclickF(uibtn2_Copy3); btnclickF(uibtn2_Copy4); btnclickT(uibtn2_Copy); uibtn2_Copy5.IsEnabled = false; keyc_grid.IsEnabled = false;
            string temp = File.ReadAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt");
            temp = temp.Replace("customkeys=1", "customkeys=" + 0);
            temp = temp.Replace("customkeys=0", "customkeys=" + 0);
            temp = temp.Replace("customkeys=2", "customkeys=" + 0);
            File.WriteAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt", temp);
        }

        private void uibtn2_Copy3_Click(object sender, RoutedEventArgs e)
        {
            keyc_mode = 1; WriteIniInt("key", "mode", 0);
            btnclickF(uibtn2_Copy); btnclickF(uibtn2_Copy3); btnclickF(uibtn2_Copy4); btnclickT(uibtn2_Copy3); uibtn2_Copy5.IsEnabled = true; keyc_grid.IsEnabled = true;
            string temp = File.ReadAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt");
            temp = temp.Replace("customkeys=1", "customkeys=" + 2);
            temp = temp.Replace("customkeys=0", "customkeys=" + 2);
            temp = temp.Replace("customkeys=2", "customkeys=" + 2);
            File.WriteAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt", temp);
        }


        private void uibtn2_Copy4_Click(object sender, RoutedEventArgs e)
        {
            keyc_mode = 2; WriteIniInt("key", "mode", 0);
            btnclickF(uibtn2_Copy); btnclickF(uibtn2_Copy3); btnclickF(uibtn2_Copy4); btnclickT(uibtn2_Copy4); uibtn2_Copy5.IsEnabled = false; keyc_grid.IsEnabled = false;
            string temp = File.ReadAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt");
            temp = temp.Replace("customkeys=1", "customkeys=" + 1);
            temp = temp.Replace("customkeys=0", "customkeys=" + 1);
            temp = temp.Replace("customkeys=2", "customkeys=" + 1);
            File.WriteAllText(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments) + @"\Warcraft III\War3Preferences.txt", temp);
        }

        private void uibtn2_Copy1_Click(object sender, RoutedEventArgs e)
        {
            if (keyc_hero == 1) { btnclickF(uibtn2_Copy1); keyc_hero = 0; WriteIniInt("key", "hero", 0); }
            else { btnclickT(uibtn2_Copy1); keyc_hero = 1; WriteIniInt("key", "hero", 1); }
        }

        private void uibtn2_Copy5_Click(object sender, RoutedEventArgs e)
        {
            writegrid(2);
        }






        private void mainbtn_del_Click(object sender, RoutedEventArgs e)
        {
            if (System.Windows.Forms.MessageBox.Show(mbtext[17], "Confirm Message", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
            {
                try { DelectDir(dir_root + "patch"); } catch { }
                try { DelectDir(dir_root + "abilities"); } catch { }
                try { DelectDir(dir_root + "abilities-dis"); } catch { }
                try { DelectDir(dir_root + "scripts"); } catch { }
                try { DelectDir(dir_root + "scripts-dis"); } catch { }
                try { DelectDir(dir_root + "objects"); } catch { }
                try { DelectDir(dir_root + "objects-dis"); } catch { }
                try { DelectDir(dir_root + "sharedfx"); } catch { }
                try { DelectDir(dir_root + "sharedfx-dis"); } catch { }
                try { DelectDir(dir_root + "sharedmodels"); } catch { }
                try { DelectDir(dir_root + "sharedmodels-dis"); } catch { }
                try { DelectDir(dir_root + "units"); } catch { }
                try { DelectDir(dir_root + "units-dis"); } catch { }
                try { DelectDir(dir_root + "collection"); } catch { }
                try { DelectDir(dir_root + "ui"); } catch { }
                try { DelectDir(dir_root + "ui-dis"); } catch { }
                try { DelectDir(dir_root + "webui"); } catch { }
                try { DelectDir(dir_root + "webui-dis"); } catch { }
                try { DelectDir(dir_root + "cos"); } catch { }
                try { DelectDir(dir_root + "es"); } catch { }
                try { DelectDir(dir_root + "qc"); } catch { }
                try { DelectDir(dir_root + "campaign"); } catch { }
                try { DelectDir(dir_root + "textures"); } catch { }
                try { DelectDir(dir_root + "textures-dis"); } catch { }
                try { DelectDir(dir_root + "terrainart"); } catch { }
                try { DelectDir(dir_root + "terrainart-dis"); } catch { }
                try { DelectDir(dir_root + "replaceabletextures"); } catch { }
                try { DelectDir(dir_root + "replaceabletextures-dis"); } catch { }
                try { DelectDir(dir_root + "shaders"); } catch { }
                try { DelectDir(dir_root + "shaders-dis"); } catch { }
                try { DelectDir(dir_root + "splats"); } catch { }
                try { DelectDir(dir_root + "doodads"); } catch { }
                try { DelectDir(dir_root + "splats-dis"); } catch { }
                try { DelectDir(dir_root + "Sound"); } catch { }
                try { DelectDir(dir_root + "Music"); } catch { }
                try { DelectDir(dir_root + "doodads-dis"); } catch { }
                try { DelectDir(dir_root + "buildings"); } catch { }
                try { DelectDir(dir_root + "buildings-dis"); } catch { }
                try { DelectDir(dir_root + "environment"); } catch { }
                try { DelectDir(dir_root + "environment-dis"); } catch { }
                try { DelectDir(dir_root + "old"); } catch { }
                try { DelectDir(dir_root + "movies"); } catch { }
                try { DelectDir(dir_root + "war3campImported"); } catch { }
                if (System.Windows.Forms.MessageBox.Show(mbtext[18], "Confirm Message", System.Windows.Forms.MessageBoxButtons.OKCancel) == System.Windows.Forms.DialogResult.OK)
                { try { DelectDir("Quenching"); } catch { } }
                System.Windows.Forms.MessageBox.Show(mbtext[19]);
            }


        }

        private void mainbtn_check_Copy1_Click(object sender, RoutedEventArgs e)
        {
            Button b = (Button)sender;
            if (GetIniInt("mod", "w3c", 0) == 0)
            {
                try
                {
                    btnclickT(b);
                    WriteIniInt("mod", "w3c", 1);
                    b.Content = mbtext[9];
                    string[] lines = File.ReadAllLines(dir_root + "webui/index.html");
                    lines[26] = "<script src=\"http://w3champions.wc3.tools/prod/integration/w3champions.js\"></script>";
                    File.WriteAllLines(dir_root + "webui/index.html", lines);
                    // File.Copy(dir_root + "webui/index.html", "./Quenching/webui/index.html", true);
                }
                catch { }


            }
            else
            {
                try
                {
                    btnclickF(b);
                    b.Content = mbtext[10];
                    WriteIniInt("mod", "w3c", 0);
                    string[] lines = File.ReadAllLines(dir_root + "webui/index.html");
                    lines[26] = "";
                    File.WriteAllLines(dir_root + "webui/index.html", lines);
                    //File.Copy(dir_root + "webui/index.html", "./Quenching/webui/index.html", true);
                }
                catch { }

            }
        }

        private void mainbtn_check_Copy1_Click_1(object sender, RoutedEventArgs e)
        {
            //if (GetIniInt("mod", "ui", 0) == 0) { copyfpb("./Quenching/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.tif", dir_root + "textures/portrait_bg_diffuse.tif-dis"); } catch { } }
            //if (GetIniInt("mod", "ui", 0) == 1) { copyfpb("./Quenching/ui-que/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { } }
            //if (GetIniInt("mod", "ui", 0) == 2) { copyfpb("./Quenching/ui-blz/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.tif-dis", dir_root + "textures/portrait_bg_diffuse.tif"); } catch { } }

            //try { File.Copy("./Quenching/dzbjq/TriggerData.txt", dir_root + "ui/TriggerData.txt"); } catch { }
            //try { File.Copy("./Quenching/dzbjq/TriggerStrings.txt", dir_root + "ui/TriggerStrings.txt"); } catch { }
            //try { File.Copy("./Quenching/dzbjq/WorldEditStrings.txt", dir_root + "ui/WorldEditStrings.txt"); } catch { }
        }

        public int map_diff = 0;
        private void map_diff_2(object sender, RoutedEventArgs e)
        {
            map_diff = 2; WriteIniInt("camp", "diff", 2);
            btnclickT(mainbtn_check_Copy10); btnclickF(achbtn1_Copy21); btnclickF(mainbtn_reset_Copy1);
        }
        private void map_diff_1(object sender, RoutedEventArgs e)
        {
            map_diff = 1; WriteIniInt("camp", "diff", 1);
            btnclickF(mainbtn_check_Copy10); btnclickT(achbtn1_Copy21); btnclickF(mainbtn_reset_Copy1);
        }
        private void map_diff_0(object sender, RoutedEventArgs e)
        {
            map_diff = 0; WriteIniInt("camp", "diff", 0);
            btnclickF(mainbtn_check_Copy10); btnclickF(achbtn1_Copy21); btnclickT(mainbtn_reset_Copy1);
        }

        private void mainbtn_check_Copy4_Click(object sender, RoutedEventArgs e)
        {
            Process myprocess = new Process();
            ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"./cfix.w3x\" -mapdiff 1 -testmapprofile WorldEdit   -fixedseed 1 ");
            //-launch -uid w3\
            //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
            myprocess.StartInfo = startInfo;
            myprocess.StartInfo.UseShellExecute = false;
            myprocess.Start();

        }

        private void achbtn1_Copy4_Click(object sender, RoutedEventArgs e)
        {

        }

        private void setbtn_about_Copy_Click(object sender, RoutedEventArgs e)
        {

        }
        private void setbtnx_Click(object sender, RoutedEventArgs e)
        {
            Button b = (Button)sender;
            if (GetIniInt("set", "tile", 0) == 0)
            {
                try
                {
                    btnclickF(b);
                    b.Content = mbtext[16];
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = 2; });
                    WriteIniInt("set", "tile", 1);
                    this.Dispatcher.Invoke(() => { pbp.Value = 1; });
                    DelectDir(dir_root + "terrainart");
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 1; });
                }
                catch { }


            }
            else
            {
                try
                {
                    btnclickT(b);
                    b.Content = mbtext[15];
                    WriteIniInt("set", "tile", 0);
                    copyf("./Quenching/terrainart", dir_root);
                }
                catch { }

            }
        }
        private void setbtn_about_Copy4_Click(object sender, RoutedEventArgs e)
        {
            Button b = (Button)sender;
            if (GetIniInt("set", "trees", 0) == 0)
            {
                try
                {
                    btnclickF(b);
                    b.Content = mbtext[16];
                    WriteIniInt("set", "trees", 1);
                    try { File.Delete(dir_root + "units/destructableskin.txt"); } catch { }
                    DelectDir(dir_root + "doodads");
                    DelectDir(dir_root + "replaceabletextures/ashenvaletree");
                    DelectDir(dir_root + "replaceabletextures/barrenstree");
                    DelectDir(dir_root + "replaceabletextures/citytree");
                    DelectDir(dir_root + "replaceabletextures/dalaranruinstree");
                    DelectDir(dir_root + "replaceabletextures/lordaerontree");
                    DelectDir(dir_root + "replaceabletextures/ruinstree");
                }
                catch { }


            }
            else
            {
                try
                {
                    btnclickT(b);
                    b.Content = mbtext[15];
                    WriteIniInt("set", "trees", 0);
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = 7; });
                    try { File.Copy("./Quenching/units/destructableskin.txt", dir_root + "units/destructableskin.txt", true); } catch { }
                    copyf("./Quenching/replaceabletextures/lordaerontree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pbp.Value = 1; });
                    copyf("./Quenching/replaceabletextures/ashenvaletree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pbp.Value = 2; });
                    copyf("./Quenching/replaceabletextures/barrenstree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pbp.Value = 3; });
                    copyf("./Quenching/replaceabletextures/citytree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pbp.Value = 4; });
                    copyf("./Quenching/replaceabletextures/dalaranruinstree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pbp.Value = 5; });
                    copyf("./Quenching/doodads", dir_root);
                    this.Dispatcher.Invoke(() => { pbp.Value = 6; });
                    copyf("./Quenching/replaceabletextures/ruinstree", dir_root + "replaceabletextures/");
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 1; });
                }
                catch { }

            }
        }
        private void achbtn4_MouseLeave(object sender, MouseEventArgs e)
        {
            achshow.Visibility = Visibility.Hidden;
        }
        private void achbtn4_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            achshow.Visibility = Visibility.Visible;
            achshowi.Source = new BitmapImage(new Uri("ach3.jpg", UriKind.Relative));
            achshowt1.Text = setstringt[17];
            achshowt2.Text = setstringc[17];
        }
        private void achbtn5_MouseLeave(object sender, MouseEventArgs e)
        {
            achshow.Visibility = Visibility.Hidden;
        }
        private void achbtn5_MouseEnter(object sender, MouseEventArgs e)
        {
            MediaPlayer player = new MediaPlayer();
            player.Open(new Uri("./quenching/ck3.mp3", UriKind.Relative));
            player.Play();
            achshow.Visibility = Visibility.Visible;
            achshowi.Source = new BitmapImage(new Uri("ach4.jpg", UriKind.Relative));
            achshowt1.Text = setstringt[18];
            achshowt2.Text = setstringc[18];
        }
        private void achcbtn1_Copy3_Click(object sender, RoutedEventArgs e)
        {

        }

        private void cosbtn1_Copy7_Click(object sender, RoutedEventArgs e)
        {
            cosunitpage = 1;
            btnclickT(cosbtn1_Copy7);
            btnclickF(cosbtn1_Copy8);
            btnclickF(cosbtn1_Copy9);
            btnclickF(cosbtn1_Copy10);
            btnclickT(cosunitbtn1);
            btnclickF(cosunitbtn3);
            btnclickF(cosunitbtn2);
            cosuniti.Source = new BitmapImage(new Uri("cosunithum0.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3];
            cosunitpic = "cosunithum0.png";
            cosunitbtn2.Content = cosunitstring[8];
            cosunitbtn3.Content = cosunitstring[14];
            if (GetIniInt("cosunit", "hum", 0) == 1)
            {
                btnclickT(cosunitbtn2);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn3);
                cosunitpic = "cosunithum1.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunithum1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[8]; cosunitt2.Text = cosunitstring[9];
            }
            if (GetIniInt("cosunit", "hum", 0) == 2)
            {
                btnclickT(cosunitbtn3);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn2);
                cosunitpic = "cosunithum2.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunithum2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[14]; cosunitt2.Text = cosunitstring[15];
            }
            return;

        }

        private void cosbtn1_Copy8_Click(object sender, RoutedEventArgs e)
        {
            cosunitpage = 2;
            btnclickT(cosbtn1_Copy8);
            btnclickF(cosbtn1_Copy7);
            btnclickF(cosbtn1_Copy9);
            btnclickF(cosbtn1_Copy10);
            btnclickT(cosunitbtn1);
            btnclickF(cosunitbtn3);
            btnclickF(cosunitbtn2);
            cosuniti.Source = new BitmapImage(new Uri("cosunitorc0.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3];
            cosunitpic = "cosunitorc0.png";
            cosunitbtn2.Content = cosunitstring[4];
            cosunitbtn3.Content = cosunitstring[16];
            if (GetIniInt("cosunit", "orc", 0) == 1)
            {
                btnclickT(cosunitbtn2);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn3);
                cosunitpic = "cosunitorc1.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunitorc1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[4]; cosunitt2.Text = cosunitstring[5];
            }
            if (GetIniInt("cosunit", "orc", 0) == 2)
            {
                btnclickT(cosunitbtn3);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn2);
                cosunitpic = "cosunitorc2.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunitorc2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[16]; cosunitt2.Text = cosunitstring[17];
            }
            return;
        }

        private void Button_Click_2(object sender, RoutedEventArgs e)
        {
            try { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/"); }
            catch { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/"); }
        }

        private void Button_Click_3(object sender, RoutedEventArgs e)
        {
            System.Diagnostics.Process.Start("www.hiveworkshop.com");

        }
        public string quezipfile;
        private void mainbtn_reset_Copy_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dialog = new OpenFileDialog();
            dialog.Multiselect = false;//该值确定是否可以选择多个 Files
            dialog.Title = mbtext[20];
            dialog.Filter = "w3n Files (*.w3n)|*.w3n|cque Files (*.cque)|*.cque;";
            if (dialog.ShowDialog() == true)
            {
                try
                {
                    DelectDir(dir_root + "war3campImported");
                    DelectDir(dir_root + "music");
                    DelectDir(dir_root + "sound");
                    DelectDir(dir_root + "campaign");
                    acht1_Copy1.Text = camptext[0];
                    level_1.Content = "#1";
                    level_1_Copy.Content = "#2";
                    level_1_Copy1.Content = "#3";
                    level_1_Copy5.Content = "#4";
                    level_1_Copy6.Content = "#5";
                    level_1_Copy7.Content = "#6";
                    level_1_Copy8.Content = "#7";
                    level_1_Copy2.Content = "#8";
                    level_1_Copy9.Content = "#9";
                    level_1_Copy10.Content = "#10";
                    level_1_Copy11.Content = "#11";
                    level_1_Copy12.Content = "#12";
                    level_1_Copy13.Content = "#13";
                    level_1_Copy14.Content = "#14";
                    level_1_Copy3.Content = "#15";
                    level_1_Copy15.Content = "#16";
                    level_1_Copy16.Content = "#17";
                    level_1_Copy17.Content = "#18";
                    level_1_Copy18.Content = "#19";
                    level_1_Copy19.Content = "#20";
                    level_1_Copy20.Content = "#21";
                    level_1_Copy4.Content = "#22";
                    level_1_Copy21.Content = "#23";
                    level_1_Copy22.Content = "#24";
                    level_1_Copy23.Content = "#25";
                    level_1_Copy24.Content = "#26";
                    level_1_Copy25.Content = "#27";
                    level_1_Copy26.Content = "#28";
                    level_1_Copy27.Content = "#29";
                    level_1_Copy28.Content = "#30";
                    level_1_Copy29.Content = "#31";
                    level_1_Copy30.Content = "#32";
                    level_1_Copy31.Content = "#33";
                    level_1_Copy32.Content = "#34";
                    level_1_Copy32.Content = "#35";
                }
                catch { }
                quezipfile = dialog.FileName;
                if (System.IO.Path.GetExtension(dialog.FileName).Contains("cque"))
                {
                    try
                    {
                        DelectDir(dir_root + "war3campImported");
                        DelectDir(dir_root + "music");
                        DelectDir(dir_root + "sound");
                        DelectDir(dir_root + "campaign");
                        zipmaxint = 900;
                        //Thread thread = new Thread(new ThreadStart(unZipFile));
                        //thread.Start();
                        pb.Visibility = Visibility.Visible;
                        unZipFile();
                        pb.Visibility = Visibility.Hidden;
                        string[] vk = File.ReadAllLines(dir_root + "campname.txt");
                        acht1_Copy1.Text = vk[0];

                        string[] vk1 = File.ReadAllLines(dir_root + "camplevel.txt");
                        int i = 0;
                        WriteIniString("ccmt", "0", "");
                        foreach (string s in vk1)
                        {
                            campb[i].Content = s;
                            WriteIniString("ccm", i.ToString(), "");
                            i++;
                        }

                    }
                    catch
                    { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 10; pbtext2.Text = mainstring[9]; }
                }
                else
                {
                    Thread thread = new Thread(new ThreadStart(w3nloader));
                    thread.Start();
                }
            }
            //获取两个绝对路径
            //Path.GetFullPath(relativePath)
            //临时工作区
            //需要一个调用，从二进制文件提取信息到ui/reforgedcampaign
            //还需要先把字符串解析出来
            //生成必要文件 - 目录
        }
        public string customcampaignname = "";
        public void w3nloader()
        {
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = 100; pbtext2.Text = mainstring[9]; });
            Directory.CreateDirectory(dir_root + "webui\\campaign\\campaignselect\\backgrounds\\");
            Directory.CreateDirectory(dir_root + "webui\\webms\\");
            string abpath = Path.GetFullPath(dir_root);
            string temppath = Path.GetFullPath(".\\Quenching\\temp");
            //streamrwDic("wc3_victoryscreen_banner_Qcustom9.png", dir_root + "webui/campaign/");
            //streamrwDic("Qcustom9_BG.png", dir_root + "webui/campaign/campaignselect/backgrounds/");
            int innerflag = 0;
            int innerflag1 = 0;
            string[] tempw3x = new string[100];
            string[] tempw3xtitle = new string[100];
            int titleflag = 0;
            DelectDir(temppath + "\\camp");
            MpqArchive archive = new MpqArchive(quezipfile, FileAccess.Read);
            Console.WriteLine(temppath + "\\base-win-listfile.txt");
            archive.ExtractFile("(listfile)", temppath + "\\base-win-listfile.txt");
            string[] vk = File.ReadAllLines(temppath + "\\base-win-listfile.txt");
            //TODO 删除之前的废文件
            for (int i = 0; i < vk.Length; i++)
            {
                Directory.CreateDirectory(temppath + "\\camp\\" + System.IO.Path.GetDirectoryName(vk[i]));
                archive.ExtractFile(vk[i], temppath + "\\camp\\" + vk[i]);
                this.Dispatcher.Invoke(() => { pbtext1.Text = mainstring[9] + vk[i]; });
            }
            //修改listfile
            string[] temp1 = File.ReadAllLines(temppath + "\\base-win-listfile.txt");
            for (int i = 0; i < temp1.Length; i++)
            {
                //TODO sound? music?
                if (temp1[i].Contains("war3campImported") || temp1[i].Contains("music") || temp1[i].Contains("sound") || temp1[i].Contains("w3x") || temp1[i].Contains("Music") || temp1[i].Contains("Sound") || temp1[i].Contains("UI\\") || temp1[i].Contains("ui\\"))
                {
                    temp1[i] = "";
                }
                // if (temp1[i].Contains("Qcustom9_BG.png")) { haspng = true; pngp = temppath + temp1[i]; temp1[i] = ""; }
                // if (temp1[i].Contains("Qcustom9_BG.webm")) { haspng = true; webp = temppath + temp1[i]; temp1[i] = ""; }
            }
            //获得w3x列表
            string tempw3f = System.Text.Encoding.UTF8.GetString(File.ReadAllBytes(temppath + "\\camp\\war3campaign.w3f"));
            Console.WriteLine(tempw3f);
            nullexample = tempw3f.Substring(1, 1);
            for (int i = 0; i < tempw3f.Length - 3; i++)
            {
                //Console.WriteLine(tempw3f.Substring(i, 5) + "\n");
                if (tempw3f.Substring(i, 3) == "w3x")
                {

                    for (int j = i; j > -1; j--)
                    {
                        if (tempw3f.Substring(j, 3).Contains("STR"))
                        { j = -5; continue; }
                        if (tempw3f.Substring(j, 1) == "x" && (tempw3f.Substring(j - 2, 3) == "w3x" || tempw3f.Substring(j - 2, 3) == "w3m"))
                        {
                            if (innerflag == 0)
                            {
                                tempw3x[innerflag] = tempw3f.Substring(j + 7, i - j - 4);
                            }
                            else { tempw3x[innerflag] = tempw3f.Substring(j + 3, i - j); }
                            j = -5;
                            Console.WriteLine(tempw3x[innerflag]);
                            innerflag++;
                        }
                    }
                }

                if (tempw3f.Substring(i, 3) == "w3x" || tempw3f.Substring(i, 3) == "w3m")
                {
                    titleflag = 0;
                    for (int j = i - 1; j > -1; j--)
                    {
                        if (tempw3f.Substring(j, 3).Contains("w3x") || tempw3f.Substring(j, 3).Contains("w3m"))
                        {
                            j = -5; continue;
                        }
                        if (tempw3f.Substring(j, 3).Contains("TRI"))
                        {
                            if (titleflag == 0)
                            { titleflag++; }
                            else
                            {
                                tempw3xtitle[innerflag1] = tempw3f.Substring(j, i - j - 1);

                                //Console.WriteLine(tempw3xtitle[innerflag1]);
                                this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + tempw3xtitle[innerflag1]; });
                                innerflag1++;
                                j = -5;
                            }

                        }

                    }
                }
            }
            //Console.WriteLine(temppath + "\\camp\\");
            //制作两份camp列表
            //streamwuni("campaigninfoclassic.txt", ".\\quenching\\temp\\camp\\campaigninfoclassic.txt");
            //streamwuni("campaigninforeforged.txt", ".\\quenching\\temp\\camp\\campaigninforeforged.txt");
            //string[] tempclassic = File.ReadAllLines(".\\quenching\\temp\\camp\\campaigninfoclassic.txt");
            //string[] tempref = File.ReadAllLines(".\\quenching\\temp\\camp\\campaigninforeforged.txt");
            //获取标题和作者
            string tempref1 = tempw3f.Substring(tempw3f.IndexOf("S") + 1, 60);
            string tempref2 = tempref1.Substring(3, tempref1.IndexOf("S") - 8);
            try
            {
                tempref1 = tempref1.Substring(tempref1.IndexOf("S") + 1, 40);
                tempref1 = tempref1.Substring(tempref1.IndexOf("S") + 1, 20);
                tempref1 = tempref1.Substring(3, tempref1.IndexOf("S") - 8);
                if (tempref1.Substring(0, 1) == "0" && tempref1.Substring(1, 1) == "0") { tempref1 = tempref1.Substring(2, tempref1.Length - 2); }
                if (tempref1.Substring(0, 1) == "0") { tempref1 = tempref1.Substring(1, tempref1.Length - 1); }
                if (tempref2.Substring(0, 1) == "0" && tempref2.Substring(1, 1) == "0") { tempref2 = tempref2.Substring(2, tempref2.Length - 2); }
                if (tempref2.Substring(0, 1) == "0") { tempref2 = tempref2.Substring(1, tempref2.Length - 1); }
                tempref1 = getwts(tempref1);
                tempref2 = getwts(tempref2);
                //Console.WriteLine(tempref1);
                //Console.WriteLine(tempref2);
            }
            catch
            {
                tempref1 = "作者未读取成功";
                tempref2 = "自定义战役";
            }
            //
            int tempwtsflag = 0;
            this.Dispatcher.Invoke(() => { acht1_Copy1.Text = tempref2; WriteIniString("ccmt", "0", tempref2); });
            for (int i = 44; i < 84; i++)
            {
                Console.WriteLine(tempw3xtitle[tempwtsflag]);
                if (tempw3xtitle[tempwtsflag] == null || tempw3xtitle[tempwtsflag] == "") { i = 100; break; }
                try
                {
                    this.Dispatcher.Invoke(() => { campb[tempwtsflag].Content = "#" + (tempwtsflag + 1) + " " + getwts(getnumber2(tempw3xtitle[tempwtsflag]));
                        WriteIniString("ccm", tempwtsflag.ToString(), getwts(getnumber2(tempw3xtitle[tempwtsflag]))); });
                    tempwtsflag++;
                    if (tempw3xtitle[tempwtsflag] == null || tempw3xtitle[tempwtsflag] == "") { i = 100; }
                }
                catch
                {
                    tempwtsflag++;

                }
            }
            //File.WriteAllLines(".\\quenching\\temp\\camp\\campaigninfoclassic.txt", tempclassic);
            //File.WriteAllLines(".\\quenching\\temp\\camp\\campaigninforeforged.txt", tempref);
            //填充w3x并改名
            for (int i = 0; i < tempw3x.Length; i++)
            {
                if ((tempw3x[i] != null && tempw3x[i] != ""))
                {
                    streamwuni("ctemp.w3x", ".\\quenching\\temp\\camp\\ctemp.w3x");
                    MpqArchive archiveT = new MpqArchive(temppath + "\\camp\\" + "ctemp.w3x", FileAccess.ReadWrite);
                    archive = new MpqArchive(temppath + "\\camp\\" + tempw3x[i], FileAccess.ReadWrite);
                    archive.ExtractFile("(listfile)", temppath + "\\camp\\" + "base-win-listfile.txt");
                    string[] tempk = File.ReadAllLines(temppath + "\\camp\\" + "base-win-listfile.txt");

                    for (int k = 0; k < tempk.Length; k++)
                    {
                        try
                        {
                            Directory.CreateDirectory(temppath + "\\camp\\" + System.IO.Path.GetDirectoryName(tempk[k]));
                            archive.ExtractFile(tempk[k], temppath + "\\camp\\" + tempk[k]);
                            archiveT.AddFileFromDisk(temppath + "\\camp\\" + tempk[k], tempk[k]);
                        }
                        catch
                        { }

                    }
                    //把战役文件塞进去
                    for (int j = 0; j < temp1.Length; j++)
                    {
                        if (temp1[j] != "" && temp1[j] != null)
                        {
                            //Console.WriteLine(temppath + "\\camp\\" + temp1[j]);
                            //Console.WriteLine(temp1[j]);
                            try
                            {
                                archiveT.AddFileFromDisk(temppath + "\\camp\\" + temp1[j], temp1[j]);
                            }
                            catch
                            { }
                        }
                    }
                    archive.Dispose();
                    archiveT.Dispose();
                    File.Delete(temppath + "\\camp\\temp.mpq");
                    File.Copy(temppath + "\\camp\\" + "ctemp.w3x", temppath + "\\camp\\" + tempw3x[i], true);
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + tempw3x[i]; });
                }
            }
            //移动到retail
            DelectDir(dir_root + "war3campImported");
            DelectDir(dir_root + "music");
            DelectDir(dir_root + "sound");
            DelectDir(dir_root + "campaign");
            //TODO 内置判断
            /*
            try
            {
                if (!haspng) { File.Copy(dir_root + "backup\\Qcustom9_BG.png", dir_root + "webui\\campaign\\campaignselect\\backgrounds\\Qcustom9_BG.png", true); }
                else { File.Copy(pngp, dir_root + "webui\\campaign\\campaignselect\\backgrounds\\Qcustom9_BG.png", true); }
                if (!haswebm) { File.Copy(dir_root + "backup\\Qcustom9_BG.webm", dir_root + "webui\\webms\\Qcustom9_BG.webm", true); }
                else { File.Copy(webp, dir_root + dir_root + "webui\\webms\\Qcustom9_BG.webm", true); }
            }
            catch { }
            */
            //
            Directory.CreateDirectory(dir_root + "campaign\\custom9\\");
            copyf(temppath + "\\camp\\war3campImported", dir_root);
            copyf(temppath + "\\camp\\music", dir_root);
            copyf(temppath + "\\camp\\sound", dir_root);
            Directory.CreateDirectory(dir_root + "campaign\\custom9\\");
            //streamwuni("c0.w3x", dir_root + "campaign\\Custom9\\c0.w3x");
            try
            {
                for (int i = 0; i < tempw3x.Length; i++)
                {
                    Console.WriteLine(tempw3x[i]);
                    File.Copy(temppath + "\\camp\\" + tempw3x[i], dir_root + "campaign\\custom9\\c" + (i + 1) + ".w3x", true);
                    if (tempw3x[i] == null || tempw3x[i] == "") { i = 1000; }
                    this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = mainstring[9] + tempw3x[i]; });
                }
            }
            catch
            {
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 10; pbtext2.Text = mainstring[9]; });
            }

            Directory.CreateDirectory(dir_root + "ui");
            //File.Copy(".\\quenching\\temp\\camp\\campaigninfoclassic.txt", dir_root + "ui\\campaigninfoclassic.txt", true);
            //File.Copy(".\\quenching\\temp\\camp\\campaigninforeforged.txt", dir_root + "ui\\campaigninforeforged.txt", true);
            DelectDir(temppath + "\\camp");
            this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbp.Maximum = 10; pbtext2.Text = mainstring[9]; });
        }

        private void mainbtn_min_Copy1_Click(object sender, RoutedEventArgs e)
        {
            readtrans = "./Quenching/trans.que";
            readhctrans = "./Quenching/hc-trans.que";
            btnclickT(mainbtn_min_Copy1);
            btnclickF(mainbtn_min_Copy2);
            btnclickF(mainbtn_min_Copy6);
            btnclickF(mainbtn_min_Copy7);
            btnclickF(mainbtn_min_Copy8);
            try { File.Copy(dir_root + "webui/QuenchingOnCN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
            WriteIniInt("mod", "lang", 0);
            initstring();
            InitUIstring();
            mainbtn_min_lang.Content = "中文";
        }

        private void mainbtn_min_Copy2_Click(object sender, RoutedEventArgs e)
        {
            readtrans = "./Quenching/trans-en.que";
            readhctrans = "./Quenching/hc-trans-en.que";
            btnclickF(mainbtn_min_Copy1);
            btnclickT(mainbtn_min_Copy2);
            btnclickF(mainbtn_min_Copy6);
            btnclickF(mainbtn_min_Copy7);
            btnclickF(mainbtn_min_Copy8);
            try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
            initstring();
            InitUIstring();
            WriteIniInt("mod", "lang", 1);
            mainbtn_min_lang.Content = "English";
        }

        private void achbtn1_Copy1_Click(object sender, RoutedEventArgs e)
        {
            try { System.Diagnostics.Process.Start(mbtext[25]); } catch { }
        }

        private void setbtn4_Copy_Click(object sender, RoutedEventArgs e)
        {
            if (hdbool == 2)
            { MessageBox.Show(mbtext[27]); return; }
            WriteIniInt("mod", "old", 0);
            WriteIniInt("mod", "melee", 1);
            setbtn_no1.Visibility = Visibility.Visible;
            //setbtn_no10.Visibility = Visibility.Visible;
            setbtn_no6.Visibility = Visibility.Visible;
            btnclickF(setbtn_n);
            //btnclickF(setbtn_o);
            btnclickT(setbtn_m);
            fileloadflag = 1;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_n_Click(object sender, RoutedEventArgs e)
        {
            if (hdbool == 2)
            { MessageBox.Show(mbtext[27]); return; }
            WriteIniInt("mod", "old", 0);
            WriteIniInt("mod", "melee", 0);
            setbtn_no1.Visibility = Visibility.Hidden;
            //setbtn_no10.Visibility = Visibility.Hidden;
            setbtn_no6.Visibility = Visibility.Hidden;
            btnclickT(setbtn_n);
            // btnclickF(setbtn_o);
            btnclickF(setbtn_m);
            fileloadflag = 31;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void setbtn_o_Click(object sender, RoutedEventArgs e)
        {
            if (hdbool == 2)
            { MessageBox.Show(mbtext[27]); return; }
            WriteIniInt("mod", "old", 1);
            WriteIniInt("mod", "melee", 0);
            setbtn_no1.Visibility = Visibility.Hidden;
            //setbtn_no10.Visibility = Visibility.Hidden;
            setbtn_no6.Visibility = Visibility.Hidden;
            btnclickF(setbtn_n);
            //btnclickT(setbtn_o);
            btnclickF(setbtn_m);
            fileloadflag = 0;
            Thread thread = new Thread(new ThreadStart(filetemplate));
            thread.Start();
        }

        private void mainbtn_min_Copy3_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(mainbtn_min_Copy3);
            btnclickF(mainbtn_min_Copy4);
            WriteIniInt("mod", "lockc", 1);
            WriteIniInt("mod", "lockh", 0);
            sdlock = true; hdlock = false;
            theout2();
        }

        private void mainbtn_min_Copy4_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(mainbtn_min_Copy3);
            btnclickT(mainbtn_min_Copy4);
            WriteIniInt("mod", "lockh", 1);
            WriteIniInt("mod", "lockc", 0);
            hdlock = true; sdlock = false;
            theout1();
        }

        private void mainbtn_min_Copy5_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(mainbtn_min_Copy3);
            btnclickF(mainbtn_min_Copy4);
            WriteIniInt("mod", "lockh", 0);
            WriteIniInt("mod", "lockc", 0);
            hdlock = false; sdlock = false;
        }

        private void mainbtn_check_Copy3_Click_1(object sender, RoutedEventArgs e)
        {
            try { File.Copy(dir_root + "shaders/ps/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
        }

        private void mainbtn_min_Copy6_Click(object sender, RoutedEventArgs e)
        {
            readtrans = "./Quenching/trans-pt.que";
            readhctrans = "./Quenching/hc-trans-pt.que";
            btnclickF(mainbtn_min_Copy1);
            btnclickF(mainbtn_min_Copy2);
            btnclickT(mainbtn_min_Copy6);
            btnclickF(mainbtn_min_Copy7);
            btnclickF(mainbtn_min_Copy8);
            try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
            initstring();
            InitUIstring();
            WriteIniInt("mod", "lang", 2);
            mainbtn_min_lang.Content = "Português";
        }
        public int cospage = 0;
        public int[] cosnextpage = { 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 };
        private void cosbtn1_Copy1_Click(object sender, RoutedEventArgs e)
        {
            int i = cosheronow;
            cospage++;
            if (cospage > 1 || (i != 2 && i != 5)) { cospage = 0; }
            if (i == 2 && cospage == 0)
            {
                cosi1.Source = new BitmapImage(new Uri(cosheropic[1], UriKind.Relative));
                cosi2.Source = new BitmapImage(new Uri(cosheropic[2], UriKind.Relative));
                cosi3.Source = new BitmapImage(new Uri(cosheropic[50], UriKind.Relative));
                cosi4.Source = new BitmapImage(new Uri(cosheropic[51], UriKind.Relative));
                cosc2.Content = cosherodes[2]; cosc3.Content = cosherodes[30]; cosc4.Content = cosherodes[31];
                cosherostate((i * 12 - 11).ToString(), (i * 12 - 10).ToString());
            }
            if (i == 2 && cospage == 1)
            {
                cosi1.Source = new BitmapImage(new Uri(cosheropic[65], UriKind.Relative));
                cosi2.Source = new BitmapImage(new Uri(cosheropic[66], UriKind.Relative));
                cosi3.Source = new BitmapImage(new Uri(cosheropic[67], UriKind.Relative));
                cosi4.Source = new BitmapImage(new Uri(cosheropic[68], UriKind.Relative));
                cosc1.Content = cosherodes[45]; cosc2.Content = cosherodes[46]; cosc3.Content = cosherodes[47]; cosc4.Content = cosherodes[48];
                cosherostate((i * 12 - 11).ToString(), (i * 12 - 10).ToString());
            }
            if (i == 5 && cospage == 1)
            {
                cosi1.Source = new BitmapImage(new Uri(cosheropic[69], UriKind.Relative));
                cosi2.Source = new BitmapImage(new Uri(cosheropic[70], UriKind.Relative));
                cosi3.Source = new BitmapImage(new Uri(cosheropic[73], UriKind.Relative));
                cosi4.Source = new BitmapImage(new Uri(cosheropic[0], UriKind.Relative));
                cosc1.Content = cosherodes[49]; cosc2.Content = cosherodes[50]; cosc3.Content = cosherodes[53]; ; cosc4.Content = cosherodes[0]; ;
                cosherostate((i * 12 - 11).ToString(), (i * 12 - 10).ToString());
            }
            if (i == 5 && cospage == 0)
            {
                cosi1.Source = new BitmapImage(new Uri(cosheropic[11], UriKind.Relative));
                cosi2.Source = new BitmapImage(new Uri(cosheropic[12], UriKind.Relative));
                cosi3.Source = new BitmapImage(new Uri(cosheropic[52], UriKind.Relative));
                cosi4.Source = new BitmapImage(new Uri(cosheropic[58], UriKind.Relative));
                cosc2.Content = cosherodes[5]; cosc3.Content = cosherodes[32]; cosc4.Content = cosherodes[38];
                cosherostate((i * 12 - 11).ToString(), (i * 12 - 10).ToString());
            }
        }

        private void cosbtn1_Copy9_Click(object sender, RoutedEventArgs e)
        {
            cosunitpage = 3;
            btnclickT(cosbtn1_Copy9);
            btnclickF(cosbtn1_Copy8);
            btnclickF(cosbtn1_Copy7);
            btnclickF(cosbtn1_Copy10);
            btnclickT(cosunitbtn1);
            btnclickF(cosunitbtn3);
            btnclickF(cosunitbtn2);
            cosuniti.Source = new BitmapImage(new Uri("cosunitud0.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[2]; cosunitt2.Text = cosunitstring[3];
            cosunitpic = "cosunitud0.png";
            cosunitbtn2.Content = cosunitstring[10];
            cosunitbtn3.Content = cosunitstring[18];
            if (GetIniInt("cosunit", "ud", 0) == 1)
            {
                btnclickT(cosunitbtn2);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn3);
                cosunitpic = "cosunitud1.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunitud1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[10]; cosunitt2.Text = cosunitstring[11];
            }
            if (GetIniInt("cosunit", "ud", 0) == 2)
            {
                btnclickT(cosunitbtn3);
                btnclickF(cosunitbtn2);
                btnclickF(cosunitbtn1);
                cosunitpic = "cosunitud2.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunitud2.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[18]; cosunitt2.Text = cosunitstring[19];
            }
            return;
        }
        private void mainbtn_min_Copy7_Click(object sender, RoutedEventArgs e)
        {
            readtrans = "./Quenching/trans-fr.que";
            readhctrans = "./Quenching/hc-trans-fr.que";
            btnclickF(mainbtn_min_Copy1);
            btnclickF(mainbtn_min_Copy2);
            btnclickF(mainbtn_min_Copy6);
            btnclickF(mainbtn_min_Copy7);
            btnclickT(mainbtn_min_Copy8);
            try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
            initstring();
            InitUIstring();
            WriteIniInt("mod", "lang", 4);
            mainbtn_min_lang.Content = "Français";
        }


        private void cosbtn1_Copy10_Click(object sender, RoutedEventArgs e)
        {
            cosunitpage = 4;
            btnclickT(cosbtn1_Copy10);
            btnclickF(cosbtn1_Copy8);
            btnclickF(cosbtn1_Copy7);
            btnclickF(cosbtn1_Copy9);
            btnclickT(cosunitbtn1);
            btnclickF(cosunitbtn3);
            btnclickF(cosunitbtn2);
            cosuniti.Source = new BitmapImage(new Uri("cosunitne0.png", UriKind.Relative));
            cosunitt1.Text = cosunitstring[12]; cosunitt2.Text = cosunitstring[13];
            cosunitpic = "cosunitne0.png";
            cosunitbtn2.Content = cosunitstring[12];
            cosunitbtn3.Content = cosunitbtn4.Content;
            if (GetIniInt("cosunit", "ne", 0) == 1)
            {
                btnclickT(cosunitbtn2);
                btnclickF(cosunitbtn1);
                btnclickF(cosunitbtn3);
                cosunitpic = "cosunitne1.png";
                cosuniti.Source = new BitmapImage(new Uri("cosunitne1.png", UriKind.Relative));
                cosunitt1.Text = cosunitstring[12]; cosunitt2.Text = cosunitstring[13];
            }
            return;
        }

        private void mainbtn_min_Copy7_Click_1(object sender, RoutedEventArgs e)
        {
            readtrans = "./Quenching/trans-ru.que";
            readhctrans = "./Quenching/hc-trans-ru.que";
            btnclickF(mainbtn_min_Copy1);
            btnclickF(mainbtn_min_Copy2);
            btnclickF(mainbtn_min_Copy6);
            btnclickT(mainbtn_min_Copy7);
            btnclickF(mainbtn_min_Copy8);
            try { File.Copy(dir_root + "webui/QuenchingOnEN.png", dir_root + "webui/QuenchingOn.png", true); } catch { }
            initstring();
            InitUIstring();
            WriteIniInt("mod", "lang", 3);
            mainbtn_min_lang.Content = "Pусский";
        }

        private void mainbtn_check_Copy5_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("mod", "off", 1);
            btnclickT(mainbtn_check_Copy5);
            btnclickF(mainbtn_check_Copy6);
            try { dirmove(dir_root + "buildings", dir_root + "buildings-dis"); } catch { }
            try { dirmove(dir_root + "doodads", dir_root + "doodads-dis"); } catch { }
            try { dirmove(dir_root + "environment", dir_root + "environment-dis"); } catch { }
            try { dirmove(dir_root + "objects", dir_root + "objects-dis"); } catch { }
            try { dirmove(dir_root + "replaceabletextures", dir_root + "replaceabletextures-dis"); } catch { }
            try { dirmove(dir_root + "scripts", dir_root + "scripts-dis"); } catch { }
            try { dirmove(dir_root + "Shaders", dir_root + "Shaders-dis"); } catch { }
            try { dirmove(dir_root + "sharedfx", dir_root + "sharedfx-dis"); } catch { }
            try { dirmove(dir_root + "sharedmodels", dir_root + "sharedmodels-dis"); } catch { }
            try { dirmove(dir_root + "splats", dir_root + "splats-dis"); } catch { }
            try { dirmove(dir_root + "terrainart", dir_root + "terrainart-dis"); } catch { }
            try { dirmove(dir_root + "textures", dir_root + "textures-dis"); } catch { }
            try { dirmove(dir_root + "units", dir_root + "units-dis"); } catch { }
            try { dirmove(dir_root + "webui", dir_root + "webui-dis"); } catch { }
            try { dirmove(dir_root + "ui", dir_root + "ui-dis"); } catch { }
        }

        private void mainbtn_check_Copy6_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("mod", "off", 0);
            btnclickT(mainbtn_check_Copy6);
            btnclickF(mainbtn_check_Copy5);
            try { dirmove(dir_root + "buildings-dis", dir_root + "buildings"); } catch { }
            try { dirmove(dir_root + "doodads-dis", dir_root + "doodads"); } catch { }
            try { dirmove(dir_root + "environment-dis", dir_root + "environment"); } catch { }
            try { dirmove(dir_root + "objects-dis", dir_root + "objects"); } catch { }
            try { dirmove(dir_root + "replaceabletextures-dis", dir_root + "replaceabletextures"); } catch { }
            try { dirmove(dir_root + "scripts-dis", dir_root + "scripts"); } catch { }
            try { dirmove(dir_root + "Shaders-dis", dir_root + "Shaders"); } catch { }
            try { dirmove(dir_root + "sharedfx-dis", dir_root + "sharedfx"); } catch { }
            try { dirmove(dir_root + "sharedmodels-dis", dir_root + "sharedmodels"); } catch { }
            try { dirmove(dir_root + "splats-dis", dir_root + "splats"); } catch { }
            try { dirmove(dir_root + "terrainart-dis", dir_root + "terrainart"); } catch { }
            try { dirmove(dir_root + "textures-dis", dir_root + "textures"); } catch { }
            try { dirmove(dir_root + "units-dis", dir_root + "units"); } catch { }
            try { dirmove(dir_root + "webui-dis", dir_root + "webui"); } catch { }
            try { dirmove(dir_root + "ui-dis", dir_root + "ui"); } catch { }
        }

        private void button2_Copy_Click(object sender, RoutedEventArgs e)
        {
            theme.Visibility = Visibility.Visible;
        }

        private void themey_Copy3_Click(object sender, RoutedEventArgs e)
        {
            theme.Visibility = Visibility.Hidden;
        }

        private void themey_Copy2_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dialog = new OpenFileDialog();
            dialog.Multiselect = false;//该值确定是否可以选择多个 Files
            dialog.Title = mbtext[20];
            dialog.Filter = "mp4 Files (*.mp4)|*.mp4|webm Files (*.webm)|*.webm;";
            if (dialog.ShowDialog() == true)
            {
                File.Copy(dialog.FileName, dir_root + "webui/webms/mainmenu.webm", true);

                WriteIniInt("mod", "them", 4);
                btnclickF(themey_Copy1);
                btnclickF(themey_Copy);
                btnclickF(themey);
                btnclickT(themey_Copy2);
            }
        }

        private void themey_Click(object sender, RoutedEventArgs e)
        {
            File.Delete(dir_root + "webui/webms/mainmenu.webm");

            WriteIniInt("mod", "them", 1);
            btnclickF(themey_Copy1);
            btnclickF(themey_Copy);
            btnclickT(themey);
            btnclickF(themey_Copy2);
        }

        private void themey_Copy_Click(object sender, RoutedEventArgs e)
        {
            File.Copy(dir_root + "webui/webms/mainmenu2.webm", dir_root + "webui/webms/mainmenu.webm", true);

            WriteIniInt("mod", "them", 2);
            btnclickF(themey_Copy1);
            btnclickT(themey_Copy);
            btnclickF(themey);
            btnclickF(themey_Copy2);
        }

        private void themey_Copy1_Click(object sender, RoutedEventArgs e)
        {
            File.Copy(dir_root + "webui/webms/mainmenu3.webm", dir_root + "webui/webms/mainmenu.webm", true);
            WriteIniInt("mod", "them", 3);
            btnclickT(themey_Copy1);
            btnclickF(themey_Copy);
            btnclickF(themey);
            btnclickF(themey_Copy2);
        }




        private void setbtn3_Copy2_Click(object sender, RoutedEventArgs e)
        {
            int gs = GetIniInt("light", "shadow", 5);
            if (gs < 10)
            { gs = gs + 1; }
            //textBlock1_Copy4.Text = gs.ToString();
            WriteIniInt("light", "shadow", gs);
            double gsf = Convert.ToDouble(gs);
            //0-23 24-35

            for (int i = 8; i < 16; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[59] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 28; i <= 35; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[35] = "static AmbIntensity " + Math.Round(0.1 - (gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 16; i < 20; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[58] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 20; i < 24; i++)
            {

                string[] lines1 = File.ReadAllLines(DNCfile[i]);
                lines1[63] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines1);
                lines1 = null;

            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {

                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {

                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }

        }

        private void setbtn3_Copy4_Click(object sender, RoutedEventArgs e)
        {
            int gs = GetIniInt("light", "light", 5);
            if (gs < 10)
            { gs = gs + 1; }
            //textBlock1_Copy5.Text = gs.ToString();
            WriteIniInt("light", "light", gs);
            double gsf = Convert.ToDouble(gs);
            //0-23 24-35
            for (int i = 8; i < 16; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[44] = "0: " + (gsf).ToString().Replace(",", ".") + ",";
                lines[45] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 16; i < 20; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + Math.Round(gsf).ToString().Replace(",", ".") + ",";
                lines[44] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 20; i < 24; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[48] = "0: " + Math.Round(gsf).ToString().Replace(",", ".") + ",";
                lines[49] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[50] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[51] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[52] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[53] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 28; i < 35; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[33] = "static Intensity " + Math.Round(gsf / 1.5, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
        }

        private void setbtn3_Copy3_Click(object sender, RoutedEventArgs e)
        {
            int gs = GetIniInt("light", "shadow", 5);
            if (gs > 0)
            { gs = gs - 1; }
            //textBlock1_Copy4.Text = gs.ToString();
            WriteIniInt("light", "shadow", gs);
            double gsf = Convert.ToDouble(gs);
            //0-23 24-35
            for (int i = 8; i < 16; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[59] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 28; i <= 35; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[35] = "static AmbIntensity " + Math.Round(0.1 - (gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 16; i < 20; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[58] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 20; i < 24; i++)
            {
                Console.WriteLine(i);
                string[] lines1 = File.ReadAllLines(DNCfile[i]);
                lines1[63] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines1);
                lines1 = null;

            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
        }

        private void setbtn3_Copy5_Click(object sender, RoutedEventArgs e)
        {
            int gs = GetIniInt("light", "light", 5);
            if (gs > 0)
            { gs = gs - 1; }
            //textBlock1_Copy5.Text = gs.ToString();
            WriteIniInt("light", "light", gs);
            double gsf = Convert.ToDouble(gs);
            //0-23 24-35
            for (int i = 0; i < 16; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[44] = "0: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 16; i < 20; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[44] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 20; i < 24; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[48] = "0: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[50] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[51] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[52] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[53] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 28; i < 35; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[33] = "static Intensity " + Math.Round(gsf / 1.5, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
        }

        public void setup_light()
        {
            int gs = GetIniInt("light", "shadow", 5);
            double gsf = Convert.ToDouble(gs);
            int gs1 = GetIniInt("light", "light", 5);
            double gsf1 = Convert.ToDouble(gs);
            //0-23 24-35
            for (int i = 8; i < 16; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[59] = "static AmbIntensity " + ((gsf * 0.05)).ToString().Replace(",", ".") + ",";
                lines[44] = "0: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "14000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "16000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "44000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "45000: " + Math.Round(gsf1 * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "46000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }

            for (int i = 16; i < 20; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[44] = "14000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "16000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "44000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "45000: " + Math.Round(gsf1 * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "46000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[58] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 20; i < 24; i++)
            {
                Console.WriteLine(i);
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[48] = "0: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "14000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[50] = "16000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[51] = "44000: " + Math.Round(gsf1 * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[52] = "45000: " + Math.Round(gsf1 * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[53] = "46000: " + Math.Round(gsf1, 2).ToString().Replace(",", ".") + ",";
                lines[63] = "static AmbIntensity " + Math.Round((gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines);
                lines = null;

            }

            for (int i = 28; i <= 35; i++)
            {

                string[] lines1 = File.ReadAllLines(DNCfile[i]);
                lines1[35] = "static AmbIntensity " + Math.Round(0.1 - (gsf * 0.05), 2).ToString().Replace(",", ".") + ",";
                lines1[33] = "static Intensity " + Math.Round(gsf1 / 1.5, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines1); lines1 = null;

            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
        }
        public int ccos_page = 0;
        public int[,] ccos_a = new int[4, 16] { { 874, 437, 1031, 602, 765, 550, 494, 383, 710, 1141, 819, 1194, 8, 176, 123, 70 }, { 2966, 2757, 2810, 2545, 3020, 2914, 3831, 3728, 3391, 3620, 3075, 2651, 2222, 2284, 2391, 2337 }, { 6867, 7515, 7081, 7460, 7669, 6815, 7777, 7724, 6921, 7408, 6975, 7926, 6635, 6705, 6760, 6579 }, { 5796, 4832, 5635, 4885, 5258, 5150, 5580, 5366, 5472, 5529, 5204, 4990, 4533, 4725, 4672, 4778 }, };

        private void achbtn1_Copy21_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dialog = new OpenFileDialog();
            dialog.Multiselect = false;//该值确定是否可以选择多个 Files
            dialog.Filter = "mdx Files (*.mdx)|*.mdx";
            if (dialog.ShowDialog() == true)
            {
                Image btn = (Image)sender;
                int i = Convert.ToInt32(btn.Tag.ToString());
                if (!File.Exists(dir_root + "units/unitskin.txt"))
                {
                    File.Copy("Quenching/unitskin-new.txt", dir_root + "units/unitskin.txt");
                }
                string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
                lines[ccos_a[ccos_page, i]] = @"file=" + System.IO.Path.GetFileName(dialog.FileName);
                if (ccos_a[ccos_page, i] == 4533) { lines[4532] = @""; }
                File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null;
                File.Copy(dir_root + "units/unitskin.txt", dir_root + "units/units-que/unitskin.txt", true);
            }
        }

        private void achbtn1_Copy29_Click(object sender, RoutedEventArgs e)
        {
            ccos_page = ccos_page - 1;
            if (ccos_page < 0)
            { ccos_page = 3; }
            if (ccos_page == 0)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeasant.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnfootman.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnrifleman.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnknight.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmortarteam.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btngyrocopter.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btngryphonrider.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btndragonhawkriderv1.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnpriest.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnsorceress.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnseigeengine.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnspellbreaker.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroarchmage.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheropaladin.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnheromountainking.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherobloodelfprince.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 1)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeon.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btngrunt.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnheadhunter.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btndemolisher.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnraider.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnkotobeast.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnwyvernriderr.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btntrollbatrider.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnspiritwalker.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btntauren.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnshaman.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnwitchdoctor.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroblademaster.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherofarseer.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btntaurenchieftain.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnshadowhunter.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 2)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnacolyte.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnghoul.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btncryptfiend.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btngargoyle.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmeatwagon.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnabomination.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnobsidianstatue.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnnecromancer.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnbanshee.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnfrostwyrm.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndestroyer.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnskeletonwarrior.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodeathknight.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherodreadlord.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnherolich.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherocryptlord.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 3)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnwisp.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnarcher.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnhuntress.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnglaivethrower.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btndryad.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("bbtndruidoftheclaw.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnmountaingiant.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnfaeriedragon.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnhippogriff.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnhippogriffrider.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndruidofthetalon.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnchimaera.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodemonhunter.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheromoonpriestess.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnkeeperofthegrove.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherowarden.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }

        }

        private void achbtn1_Copy_Click(object sender, RoutedEventArgs e)
        {
            //启动时steam一个备份到quenching
            //按重置时重置对应的行
            Button btn = (Button)sender;
            int i = Convert.ToInt32(btn.Tag.ToString());
            if (!File.Exists(dir_root + "units/unitskin.txt"))
            {
                File.Copy("Quenching/unitskin.txt", dir_root + "units/unitskin.txt");
            }
            string[] lines = File.ReadAllLines(dir_root + "units/unitskin.txt");
            string[] lines1 = File.ReadAllLines("Quenching/unitskin-new.txt");
            lines[ccos_a[ccos_page, i]] = lines1[ccos_a[ccos_page, i]];
            if (ccos_a[ccos_page, i] == 4533) { lines[4532] = lines1[4532]; }
            File.WriteAllLines(dir_root + "units/unitskin.txt", lines); lines = null; lines1 = null;
            File.Copy(dir_root + "units/unitskin.txt", dir_root + "units/units-que/unitskin.txt", true);
        }

        private void achbtn1_Copy36_Click(object sender, RoutedEventArgs e)
        {
            ccos_page = ccos_page + 1;
            if (ccos_page > 3)
            { ccos_page = 0; }
            if (ccos_page == 0)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeasant.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnfootman.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnrifleman.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnknight.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmortarteam.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btngyrocopter.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btngryphonrider.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btndragonhawkriderv1.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnpriest.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnsorceress.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnseigeengine.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnspellbreaker.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroarchmage.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheropaladin.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnheromountainking.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherobloodelfprince.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 1)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeon.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btngrunt.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnheadhunter.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btndemolisher.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnraider.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnkotobeast.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnwyvernrider.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btntrollbatrider.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnspiritwalker.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btntauren.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnshaman.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnwitchdoctor.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroblademaster.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherofarseer.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btntaurenchieftain.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnshadowhunter.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 2)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnacolyte.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnghoul.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btncryptfiend.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btngargoyle.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmeatwagon.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnabomination.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnobsidianstatue.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnnecromancer.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnbanshee.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnfrostwyrm.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndestroyer.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnskeletonwarrior.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodeathknight.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherodreadlord.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnherolich.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherocryptlord.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 3)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnwisp.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnarcher.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnhuntress.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnglaivethrower.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btndryad.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btndruidoftheclaw.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnmountaingiant.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnfaeriedragon.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnhippogriff.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnhippogriffrider.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndruidofthetalon.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnchimaera.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodemonhunter.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheromoonpriestess.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnkeeperofthegrove.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherowarden.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
        }

        private void button2_Copy1_Click(object sender, RoutedEventArgs e)
        {

            if (ccos_page == 0)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeasant.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnfootman.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnrifleman.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnknight.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmortarteam.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btngyrocopter.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btngryphonrider.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btndragonhawkriderv1.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnpriest.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnsorceress.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnseigeengine.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnspellbreaker.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroarchmage.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheropaladin.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnheromountainking.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherobloodelfprince.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 1)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnpeon.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btngrunt.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnheadhunter.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btndemolisher.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnraider.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnkotobeast.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnwyvernriderr.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btntrollbatrider.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnspiritwalker.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btntauren.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btnshaman.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnwitchdoctor.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnheroblademaster.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherofarseer.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btntaurenchieftain.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnshadowhunter.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 2)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnacolyte.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnghoul.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btncryptfiend.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btngargoyle.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btnmeatwagon.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("btnabomination.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnobsidianstatue.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnnecromancer.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnbanshee.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnfrostwyrm.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndestroyer.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnskeletonwarrior.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodeathknight.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnherodreadlord.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnherolich.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherocryptlord.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            if (ccos_page == 3)
            {
                ccos_btn1.Source = new BitmapImage(new Uri("btnwisp.png", UriKind.Relative));
                ccos_btn1_Copy.Source = new BitmapImage(new Uri("btnarcher.png", UriKind.Relative));
                ccos_btn1_Copy6.Source = new BitmapImage(new Uri("btnhuntress.png", UriKind.Relative));
                ccos_btn1_Copy1.Source = new BitmapImage(new Uri("btnglaivethrower.png", UriKind.Relative));
                ccos_btn1_Copy2.Source = new BitmapImage(new Uri("btndryad.png", UriKind.Relative));
                ccos_btn1_Copy3.Source = new BitmapImage(new Uri("bbtndruidoftheclaw.png", UriKind.Relative));
                ccos_btn1_Copy4.Source = new BitmapImage(new Uri("btnmountaingiant.png", UriKind.Relative));
                ccos_btn1_Copy5.Source = new BitmapImage(new Uri("btnfaeriedragon.png", UriKind.Relative));
                ccos_btn1_Copy7.Source = new BitmapImage(new Uri("btnhippogriff.png", UriKind.Relative));
                ccos_btn1_Copy12.Source = new BitmapImage(new Uri("btnhippogriffrider.png", UriKind.Relative));
                ccos_btn1_Copy11.Source = new BitmapImage(new Uri("btndruidofthetalon.png", UriKind.Relative));
                ccos_btn1_Copy10.Source = new BitmapImage(new Uri("btnchimaera.png", UriKind.Relative));
                ccos_btn1_Copy13.Source = new BitmapImage(new Uri("btnherodemonhunter.png", UriKind.Relative));
                ccos_btn1_Copy14.Source = new BitmapImage(new Uri("btnheromoonpriestess.png", UriKind.Relative));
                ccos_btn1_Copy15.Source = new BitmapImage(new Uri("btnkeeperofthegrove.png", UriKind.Relative));
                ccos_btn1_Copy16.Source = new BitmapImage(new Uri("btnherowarden.png", UriKind.Relative));
                achmaint1.Text = cosherostring[ccos_page];
            }
            achmain.Visibility = Visibility.Visible;
        }

        private void achbtn1_Copy20_Click(object sender, RoutedEventArgs e)
        {
            achmain.Visibility = Visibility.Hidden;
        }

        private void achbtn2_Copy3_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dialog = new OpenFileDialog();
            dialog.Multiselect = false;//该值确定是否可以选择多个 Files
            dialog.Title = mbtext[20];
            dialog.Filter = "w3x Files (*.w3x)|*.w3x|w3m Files (*.w3m)|*.w3m;"; 
            if (dialog.ShowDialog() == true)
            {

                File.Copy(dialog.FileName, "./quenching/" + System.IO.Path.GetFileName(dialog.FileName), true);
                try
                {
                    Process myprocess = new Process();
                    ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\quenching\\" + System.IO.Path.GetFileName(dialog.FileName) + " \" -mapdiff " + map_diff.ToString() + " -testmapprofile WorldEdit ");
                    myprocess.StartInfo = startInfo;
                    myprocess.StartInfo.UseShellExecute = false;
                    myprocess.Start();
                }
                catch { }
            }
        }

        private void achbtn2_Copy3_Click_1(object sender, RoutedEventArgs e)
        {
            try
            {
                Process myprocess = new Process();
                Button btn = (Button)sender;
                int i = Convert.ToInt32(btn.Tag.ToString());
                ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\_retail_\\campaign\\Custom9\\c" + i + ".w3x\" -mapdiff " + map_diff.ToString() + " -testmapprofile WorldEdit ");
                myprocess.StartInfo = startInfo;
                myprocess.StartInfo.UseShellExecute = false;
                myprocess.Start();
            }
            catch { }
            //-launch -uid w3\
            //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
        }

        private void setbtn2_Click(object sender, RoutedEventArgs e)
        {

        }

        private void achbtn1_Copy1_Click_1(object sender, RoutedEventArgs e)
        {
            DelectDir(dir_root + "war3campImported");
            DelectDir(dir_root + "music");
            DelectDir(dir_root + "sound");
            DelectDir(dir_root + "campaign");
            acht1_Copy1.Text = camptext[0];
            level_1.Content = "#1";
            level_1_Copy.Content = "#2";
            level_1_Copy1.Content = "#3";
            level_1_Copy5.Content = "#4";
            level_1_Copy6.Content = "#5";
            level_1_Copy7.Content = "#6";
            level_1_Copy8.Content = "#7";
            level_1_Copy2.Content = "#8";
            level_1_Copy9.Content = "#9";
            level_1_Copy10.Content = "#10";
            level_1_Copy11.Content = "#11";
            level_1_Copy12.Content = "#12";
            level_1_Copy13.Content = "#13";
            level_1_Copy14.Content = "#14";
            level_1_Copy3.Content = "#15";
            level_1_Copy15.Content = "#16";
            level_1_Copy16.Content = "#17";
            level_1_Copy17.Content = "#18";
            level_1_Copy18.Content = "#19";
            level_1_Copy19.Content = "#20";
            level_1_Copy20.Content = "#21";
            level_1_Copy4.Content = "#22";
            level_1_Copy21.Content = "#23";
            level_1_Copy22.Content = "#24";
            level_1_Copy23.Content = "#25";
            level_1_Copy24.Content = "#26";
            level_1_Copy25.Content = "#27";
            level_1_Copy26.Content = "#28";
            level_1_Copy27.Content = "#29";
            level_1_Copy28.Content = "#30";
            level_1_Copy29.Content = "#31";
            level_1_Copy30.Content = "#32";
            level_1_Copy31.Content = "#33";
            level_1_Copy32.Content = "#34";
            level_1_Copy32.Content = "#35";
            WriteIniString("ccmt", "0", "");
            for (int i = 0; i < 35; i++)
            {
                WriteIniString("ccm", i.ToString(), "");
            }
        }

        private void achbtn1_Copy21_Click_1(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("mod", "lang", 0) == 0) { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/QMdownload.html"); }
            else { System.Diagnostics.Process.Start("http://tianxiazhengyi.net/QMdownloadEN.html"); }
        }

        private void mainbtn_check_Copy3_Click_2(object sender, RoutedEventArgs e)
        {

        }

        private void mainbtn_check_Copy7_Click(object sender, RoutedEventArgs e)
        {
            try { File.Copy(dir_root + "shaders/ps/NVshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/NVshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
        }

        private void mainbtn_check_Copy3_Click_3(object sender, RoutedEventArgs e)
        {

            if (GetIniInt("mod", "lang", 0) == 0)
            { System.Diagnostics.Process.Start("https://ui-zorrot.gitbook.io/mod/"); }
            else
            { System.Diagnostics.Process.Start("https://ui-zorrot.gitbook.io/quenching-mod-guide-book/"); }
        }

        private void setbtn_light_level(object sender, RoutedEventArgs e)
        {
            Button btn = (Button)sender;

            btnclickT(setbtn_light_1);
            btnclickF(setbtn_light_2);
            btnclickF(setbtn_light_3);
            btnclickF(setbtn_light_4);

            int gs = 3 + (Convert.ToInt32(btn.Tag.ToString()) * 2 );
            WriteIniInt("light", "light", gs);
            double gsf = Convert.ToDouble(gs);

            //0-23 24-35
            for (int i = 12; i < 16; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + (gsf).ToString().Replace(",", ".") + ",";
                lines[44] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 8; i < 12; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[44] = "0: " + (gsf).ToString().Replace(",", ".") + ",";
                lines[45] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[49] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 16; i < 20; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + Math.Round(gsf).ToString().Replace(",", ".") + ",";
                lines[44] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[45] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[46] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[47] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[48] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 20; i < 24; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[48] = "0: " + Math.Round(gsf).ToString().Replace(",", ".") + ",";
                lines[49] = "14000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                lines[50] = "16000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[51] = "44000: " + Math.Round(gsf * 1.28, 2).ToString().Replace(",", ".") + ",";
                lines[52] = "45000: " + Math.Round(gsf * 1.4, 2).ToString().Replace(",", ".") + ",";
                lines[53] = "46000: " + Math.Round(gsf, 2).ToString().Replace(",", ".") + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 24; i < 28; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[29] = "static Intensity " + Math.Round(gsf / 1.5, 2).ToString().Replace(",", ".") + ",";
                lines[31] = "static AmbIntensity -0.15, ";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            for (int i = 28; i < 35; i++)
            {
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[33] = "static Intensity " + Math.Round(gsf / 1.5, 2).ToString().Replace(",", ".") + ",";
                lines[35] = "static AmbIntensity -0.15, ";
                File.WriteAllLines(DNCfile[i], lines); lines = null;
            }
            DelectDir(dir_root + "environment/dnc");
            Directory.CreateDirectory(dir_root + "environment/dnc");
            if (GetIniInt("mod", "light", 0) == 0)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dnc45/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
            if (GetIniInt("mod", "light", 0) == 1)
            {
                try
                {
                    //DelectDir(dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncashenvale", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdalaran", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncdungeon", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncfelwood", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dnclordaeron", dir_root + "environment/dnc");
                    copyf(dir_root + "environment/dncspin/dncunderground", dir_root + "environment/dnc");
                }
                catch { }
            }
        }

        public int mod_one_num = 0;
        public string mod_one_string = "";
        private void Mod_Setup_OneZip(object sender, RoutedEventArgs e)
        {
            System.IO.FileInfo f;
            Button btn = (Button)sender;
            try
            {
                if (File.Exists("./quenching/temp/patch-" + btn.Content + ".zip"))
                {
                    f = new FileInfo("./quenching/temp/patch-" + btn.Content + ".zip");
                    if (f.Length < 50000000) { try { File.Delete("./quenching/temp/patch-" + btn.Content + ".zip"); } catch { } }
                }
                if (File.Exists("./quenching/temp/patch-" + btn.Content + ".zip"))
                {
                    quezipfile = "./quenching/temp/patch-" + btn.Content + ".zip";
                    zipmaxint = 250;
                    unZipFileLZD();
                }
                else
                {
                    mod_one_num = Convert.ToInt32(btn.Content);
                    mod_one_string = btn.Content.ToString();
                    Thread thread = new Thread(new ThreadStart(mod_one_donwload));
                    thread.Start(); return;
                }
            }
            catch { }
        }

        private void mod_one_donwload()
        {
            bool a = DownloadFile(fseverurl + "filelist.que", "./quenching/" + "filelist.que");
            if (a)
            {
                //处理下载列表
                String line;
                System.IO.FileInfo f;
                //MessageBox.Show("haha");
                //nr.Close();
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; });
                string[] sr = File.ReadAllLines("./quenching/filelist.que");
                if (!File.Exists("./quenching/temp/patch-" + mod_one_string + ".zip"))
                {
                    this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = 100000; pbp.Value = 0; pbtext1.Text = mainstring[6] + "QMmod.part" + mod_one_string; });
                    if (File.Exists("./quenching/temp/patch-" + mod_one_string + ".zip"))
                    {
                        f = new FileInfo("./quenching/temp/patch-" + mod_one_string + ".zip");
                        if (f.Length < 50000000) { try { File.Delete("./quenching/temp/patch-" + mod_one_string + ".zip"); } catch { } }
                    }
                    if (DownloadLZFile(sr[(mod_one_num-1)*2], "./quenching/temp/patch-" + mod_one_string + ".temp", sr[(mod_one_num - 1) * 2 + 1]))
                    {
                        File.Copy("./quenching/temp/patch-" + mod_one_string + ".temp", "./quenching/temp/patch-" + mod_one_string + ".zip", true);
                        File.Delete("./quenching/temp/patch-" + mod_one_string + ".temp");
                        quezipfile = "./quenching/temp/patch-" + mod_one_string + ".zip";
                        zipmaxint = 300;
                        unZipFileLZD();
                    }
                    else
                    {
                        MessageBox.Show(mainstring[2]);
                        this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });
                        return;
                    }
                }
            }
        }


        //--------------------------------------------------------

        private void SetGPU_AMD(object sender, RoutedEventArgs e)
        {
            //try { File.Copy("./Quenching/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls",true); } catch { }
            //try { File.Copy("./Quenching/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls",true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            btnclickT(mb_gpu_1);
            btnclickF(mb_gpu_2);
            WriteIniInt("mod", "gpuset", 1);
        }
        private void SetGPU_NV(object sender, RoutedEventArgs e)
        {
            //try { File.Copy("./Quenching/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls",true); } catch { }
            //try { File.Copy("./Quenching/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls",true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/NVshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
            try { File.Copy(dir_root + "shaders/ps/NVshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            btnclickT(mb_gpu_2);
            btnclickF(mb_gpu_1);
            WriteIniInt("mod", "gpuset", 0);
        }

        private void mb_mod_open(object sender, RoutedEventArgs e)
        {
            dl_m_mod.Visibility = Visibility.Visible;
        }
        private void mb_lang_open(object sender, RoutedEventArgs e)
        {
            dl_m_lang.Visibility = Visibility.Visible;
        }
        private void mb_lang_close(object sender, RoutedEventArgs e)
        {
            dl_m_lang.Visibility = Visibility.Hidden;
        }
        private void mb_set_open(object sender, RoutedEventArgs e)
        {
            dl_m_set.Visibility = Visibility.Visible;
        }
        private void mb_set_close(object sender, RoutedEventArgs e)
        {
            dl_m_set.Visibility = Visibility.Hidden;
        }
        private void mb_mod_close(object sender, RoutedEventArgs e)
        {
            dl_m_mod.Visibility = Visibility.Hidden;
        }
        private void Msg_mod_y_Click(object sender, RoutedEventArgs e)
        {
            Msg_mod_setup.Visibility = Visibility.Hidden;
        }

        private void Msg_mod_n_Click(object sender, RoutedEventArgs e)
        {
            Msg_mod_setup.Visibility = Visibility.Hidden;
        }

        private void mainbtn_check_Copy35_Click(object sender, RoutedEventArgs e)
        {
            btnclickT(mainbtn_check_Copy35);
            btnclickF(mainbtn_check_Copy36);
            downloadline = 0;
            WriteIniInt("mod", "dline", 0);
        }

        private void mainbtn_check_Copy36_Click(object sender, RoutedEventArgs e)
        {
            btnclickF(mainbtn_check_Copy35);
            btnclickT(mainbtn_check_Copy36);
            downloadline = 0;
            WriteIniInt("mod", "dline", 1);
        }

        private void to132(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            if (!File.Exists("./Quenching/temp/shaders-132.zip"))
            { streamrwDic("shaders-132.zip", "./quenching/temp/"); }
            DelectDir("./_retail_/shaders");
            unZipFiledist("./Quenching/temp/shaders-132.zip", "./_retail_/shaders");
            if (GetIniInt("mod","gpuset",0) == 1)
            {
                try { File.Copy(dir_root + "shaders/ps/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
                try { File.Copy(dir_root + "shaders/ps/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            }
            else
            {
                try { File.Copy(dir_root + "shaders/ps/NVshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
                try { File.Copy(dir_root + "shaders/ps/NVshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            }
            if (GetIniInt("mod", "ui", 0) == 0)
            {
                try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-org/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
            }
            else
            {
                try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-que/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
            }
            try { dirmove(dir_root + "units/demon/doomguard", dir_root + "units/demon/doomguard-dis"); } catch { }
            try { dirmove(dir_root + "units/demon/doomguardsummoned", dir_root + "units/demon/doomguardsummoned-dis"); } catch { }
            
            WriteIniInt("mod", "version", 1);
            btnclickF(mainbtn_check_Copy7);btnclickT(mainbtn_check_Copy);
        }
        private void to133(object sender, RoutedEventArgs e)
        {
            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            if (!File.Exists("./Quenching/temp/shaders-133.zip"))
            { streamrwDic("shaders-133.zip", "./quenching/temp/"); }
            DelectDir("./_retail_/shaders");
            unZipFiledist("./Quenching/temp/shaders-133.zip", "./_retail_/shaders");
            if (GetIniInt("mod", "gpuset", 0) == 1)
            {
                try { File.Copy(dir_root + "shaders/ps/AMDshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
                try { File.Copy(dir_root + "shaders/ps/AMDshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            }
            else
            {
                try { File.Copy(dir_root + "shaders/ps/NVshader/gaussianblur.bls", dir_root + "shaders/ps/gaussianblur.bls", true); } catch { }
                try { File.Copy(dir_root + "shaders/ps/NVshader/bloomextract.bls", dir_root + "shaders/ps/bloomextract.bls", true); } catch { }
            }
            if (GetIniInt("mod", "ui", 0) == 0)
            {
                try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-org/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
            }
            else
            {
                try { File.Delete(dir_root + "shaders/ps/hd.bls"); File.Copy(dir_root + "shaders/ps/ui-que/hd.bls", dir_root + "shaders/ps/hd.bls", true); } catch { }
            }
            try { dirmove(dir_root + "units/demon/doomguard-dis", dir_root + "units/demon/doomguard"); } catch { }
            try { dirmove(dir_root + "units/demon/doomguardsummoned-dis", dir_root + "units/demon/doomguardsummoned"); } catch { }
            WriteIniInt("mod", "version", 0);
            btnclickT(mainbtn_check_Copy7); btnclickF(mainbtn_check_Copy);
        }

        public int cos_u_or_h = 0;
        public int cos_hero_pos = 0;
        public int cos_unit_pos = 0;
        public int cosunitflag = 0;
        private void cos_to_hum(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            iconhalo1.Visibility = Visibility.Visible;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Hidden;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 0;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag,0,cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 0;
                cos_unit_pos = cos_unit_now[0];
                cosutext.Text = cos_unit_des[cosunitflag,cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[0, cos_unit_now[0]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }

        }

        private void cos_to_orc(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            iconhalo1.Visibility = Visibility.Hidden;
            iconhalo2.Visibility = Visibility.Visible;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Hidden;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 1;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 1;
                cos_unit_pos = cos_unit_now[cosunitflag];
                cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[cosunitflag, cos_unit_now[cosunitflag]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }

        }

        private void cos_to_ud(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            iconhalo1.Visibility = Visibility.Hidden;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Visible;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Hidden;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 2;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 2;
                cos_unit_pos = cos_unit_now[cosunitflag];
                cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[cosunitflag, cos_unit_now[cosunitflag]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }

        }
        private void cos_to_ne(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Hidden;
            iconhalo1.Visibility = Visibility.Hidden;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Visible;
            iconhalo5.Visibility = Visibility.Hidden;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 3;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }
            else
            {
                //切换下方第一个(人族）
                cosunitflag = 3;
                cos_unit_pos = cos_unit_now[cosunitflag];
                cosutext.Text = cos_unit_des[cosunitflag, cos_unit_pos];
                cosiunit.Source = new BitmapImage(new Uri(cos_unit_png[cosunitflag, cos_unit_now[cosunitflag]], UriKind.Relative));
                btnclickT(cosbtn1_u);
            }

        }
        private void cos_to_t(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Visible;
            iconhalo1.Visibility = Visibility.Hidden;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Visible;
            if (cos_u_or_h == 0)
            {
                cosheroflag = 4;
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }

        }

        private void cos_to_t2(object sender, RoutedEventArgs e)
        {
            cosbtn1_Copy3.Visibility = Visibility.Visible;
            iconhalo1.Visibility = Visibility.Hidden;
            iconhalo2.Visibility = Visibility.Hidden;
            iconhalo3.Visibility = Visibility.Hidden;
            iconhalo4.Visibility = Visibility.Hidden;
            iconhalo5.Visibility = Visibility.Visible;
            if (cos_u_or_h == 0)
            {
                if (cosheroflag == 4)
                { cosheroflag = 5; }
                else
                { cosheroflag = 4; }
                
                cosimage1.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag], UriKind.Relative));
                cosimage2.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 1], UriKind.Relative));
                cosimage3.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 2], UriKind.Relative));
                cosimage4.Source = new BitmapImage(new Uri(cosheroicon[4 * cosheroflag + 3], UriKind.Relative));
                cosimage1.Tag = 1;
                cosimage2.Tag = 2;
                cosimage3.Tag = 3;
                cosimage4.Tag = 4;
                //将下方切换至目前第一个英雄的选项(人族大法师)
                cos_hero_pos = 0;
                cosheronow = 1;
                cosihero.Source = new BitmapImage(new Uri(cos_hero_png[cosheroflag, 0, cos_hero_now[cosheroflag, 0]], UriKind.Relative));
                cosherotext.Text = cos_hero_des[cosheroflag, cosheronow - 1, cos_hero_pos];
                btnclickT(cosbtn1_Copy2);
            }

        }

        private void panel_update_click(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("mod", "off", 0) == 1)
            {
                MessageBox.Show("不能在Mod关闭时进行设置"); return;//
            }
            if (GridChangeFlag == false)
            {
                mb.Visibility = Visibility.Hidden;
                mb1.Visibility = Visibility.Visible;
                mb2.Visibility = Visibility.Hidden;
                mb3.Visibility = Visibility.Hidden;
                mb4.Visibility = Visibility.Hidden;
                MediaPlayer player = new MediaPlayer();
                player.Open(new Uri("./quenching/ck1.mp3", UriKind.Relative));
                player.Play();
                GridChangeFlag = true;
                GridReadyshow = uigrid;
                System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
                tmr.Interval = TimeSpan.FromSeconds(0.01);
                tmr.Tick += new EventHandler(fadeout);
                tmr.Start();
            }
        }

        private void newt2b1_Click(object sender, RoutedEventArgs e)
        {
            //将terrainart变成-que，将-old变成terrainart
            //解压出desold替代现在的dis
            //好像就可以了
            if (!Directory.Exists(dir_root + "terrainart-old")) { MessageBox.Show("需要先安装新版本"); return; }
            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]);return; }
            else
            {
                dirmove(dir_root + "terrainart", dir_root + "terrainart-que");
                dirmove(dir_root + "terrainart-old", dir_root + "terrainart");
                File.Delete(dir_root + "units/destructableskin.txt");
                streamname("destructableskin-old.txt", dir_root + "units/destructableskin.txt");
                streamname("foliage-old.txt", dir_root + "environment/foliage/foliage.txt");
                WriteIniInt("mod", "newold", 1);
                btnclickT(newt2b1);
                btnclickF(newt2b2);
            }
            
        }

        private void newt2b2_Click(object sender, RoutedEventArgs e)
        {
            //将terrainart变成-que，将-old变成terrainart
            //解压出desold替代现在的dis
            //好像就可以了

            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            else
            {
                dirmove(dir_root + "terrainart", dir_root + "terrainart-old");
                dirmove(dir_root + "terrainart-que", dir_root + "terrainart"); 
                streamname("destructableskin-que.txt", dir_root + "units/destructableskin.txt");
                streamname("foliage-que.txt", dir_root + "environment/foliage/foliage.txt");
                WriteIniInt("mod", "newold", 0);
                btnclickF(newt2b1);
                btnclickT(newt2b2);
            }
        }

        private void newt3b1_Click(object sender, RoutedEventArgs e)
        {
            //将terrainart变成-que，将-old变成terrainart
            //解压出desold替代现在的dis
            //好像就可以了
            if (!Directory.Exists(dir_root + "doodads/Quenching/lordaerontree-short")) { MessageBox.Show("需要先下载新版本"); return; }
            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            else
            {
                dirmove(dir_root + "doodads/Quenching/lordaerontree", dir_root + "doodads/Quenching/lordaerontree-long");
                dirmove(dir_root + "doodads/Quenching/lordaerontree-short", dir_root + "doodads/Quenching/lordaerontree");
                WriteIniInt("tree", "short", 1);
                btnclickT(newt3b1);
                btnclickF(newt3b2);
            }

        }

        private void newt3b2_Click(object sender, RoutedEventArgs e)
        {
            //将terrainart变成-que，将-old变成terrainart
            //解压出desold替代现在的dis
            //好像就可以了

            if (oldorsd == 1)
            { MessageBox.Show(mbtext[27]); return; }
            else
            {
                dirmove(dir_root + "doodads/Quenching/lordaerontree", dir_root + "doodads/Quenching/lordaerontree-short");
                dirmove(dir_root + "doodads/Quenching/lordaerontree-long", dir_root + "doodads/Quenching/lordaerontree");
                WriteIniInt("tree", "short", 0);
                btnclickF(newt3b1);
                btnclickT(newt3b2);
            }

        }

        private void uibtnsm1_Copy5_Click(object sender, RoutedEventArgs e)
        {
            if (File.Exists("./lsonc1.w3x"))
            {
                Process myprocess = new Process();
                ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\lsonc1.w3x\" -mapdiff 1  -testmapprofile WorldEdit  -fixedseed 1 ");
                //-launch -uid w3\
                //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
                myprocess.StartInfo = startInfo;
                myprocess.StartInfo.UseShellExecute = false;
                myprocess.Start();
                return;
            }
            if (File.Exists("./quenching/temp/lsonc1.w3x"))
            {
                Process myprocess = new Process();
                ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\quenching\\temp\\lsonc1.w3x\" -mapdiff 1 -testmapprofile WorldEdit   -fixedseed 1 ");
                //-launch -uid w3\
                //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
                myprocess.StartInfo = startInfo;
                myprocess.StartInfo.UseShellExecute = false;
                myprocess.Start();
                return;
            }
            else
            {
                Thread thread = new Thread(new ThreadStart(download_rpg));
                thread.Start(); return;
            }
        }

        private void uibtnsm1_Copy1_Click(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("mod", "lang", 0) == 0) { System.Diagnostics.Process.Start("www.tianxiazhengyi.net/QMDownload.html"); }
            else { System.Diagnostics.Process.Start("www.tianxiazhengyi.net/QMDownloadEN.html"); }
            
        }

        public void download_rpg()
        {
            bool a = DownloadFile(fseverurl + "rpg-lson1.que", "./quenching/" + "rpg-lson1.que");
            if (a)
            {
                //处理下载列表
                String line;
                System.IO.FileInfo f;
                //MessageBox.Show("haha");
                //nr.Close();
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; });
                string[] sr = File.ReadAllLines("./quenching/rpg-lson1.que");
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Maximum = 100000; pbp.Value = 0; pbtext1.Text = mainstring[6] + "Lsonc1.zip"; });
                if (DownloadLZFile(sr[0], "./quenching/temp/lsonc1.temp", sr[1]))
                {
                    File.Copy("./quenching/temp/lsonc1.temp", "./quenching/temp/lsonc1.w3x", true);
                    File.Delete("./quenching/temp/lsonc1.temp");
                    this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });
                    Process myprocess = new Process();
                    ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\quenching\\temp\\lsonc1.w3x\" -mapdiff 1 -testmapprofile WorldEdit   -fixedseed 1 ");
                    //-launch -uid w3\
                    //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
                    myprocess.StartInfo = startInfo;
                    myprocess.StartInfo.UseShellExecute = false;
                    myprocess.Start();
                    return;
                }
                else
                {
                    if (DownloadFilewpb("https://quenching.hiveworkshop.com/Lsonc1.w3x", "./quenching/temp/lsonc1.temp"))
                    {
                        File.Copy("./quenching/temp/lsonc1.temp", "./quenching/temp/lsonc1.w3x", true);
                        File.Delete("./quenching/temp/lsonc1.temp");
                        this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });
                        Process myprocess = new Process();
                        ProcessStartInfo startInfo = new ProcessStartInfo(dir_root + "x86_64/Warcraft III.exe", "-launch -loadfile \"" + Directory.GetCurrentDirectory() + "\\quenching\\temp\\lsonc1.w3x\" -mapdiff 1 -testmapprofile WorldEdit   -fixedseed 1 ");
                        //-launch -uid w3\
                        //-launch -loadfile \".\\Quenching\\webui\\q1.w3x\" -mapdiff 1  
                        myprocess.StartInfo = startInfo;
                        myprocess.StartInfo.UseShellExecute = false;
                        myprocess.Start();
                        return;
                    }
                    else
                    {
                        MessageBox.Show(mainstring[2]);
                        this.Dispatcher.Invoke(() => { maincheckt.Text = mainstring[2] + System.Environment.NewLine + getonelineque("./quenching/version.que"); pb.Visibility = Visibility.Hidden; });
                        return;
                    }
                }
            }
            else
            {
                MessageBox.Show(mainstring[2]);
            }
        }

        private void num1_MouseDown(object sender, MouseButtonEventArgs e)
        {
            System.Threading.Tasks.Task.Delay(10);
            TextBox temp = (TextBox)sender;
            temp.Focus();
        }



    private void uibtnsm1_Copy_Click_1(object sender, RoutedEventArgs e)
        {
            if (GetIniInt("set", "sound", 0) == 0)
            {
                WriteIniInt("set", "sound", 1);
                btnclickT(uibtnsm1_Copy);
                Thread thread = new Thread(new ThreadStart(English_Voice));
                thread.Start();
            }
            else
            {
                WriteIniInt("set", "sound", 0);
                string[] files = Directory.GetFiles(dir_root, "*.*", SearchOption.AllDirectories);
                foreach (string file in files)
                {
                    if (file.Contains(".flac"))
                    {
                        File.Delete(file);
                    }
                   
                }
               
                btnclickF(uibtnsm1_Copy);
            }
                

    }


    }

}


/*
            for (int i = 0; i < 16; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[59] = "static AmbIntensity " + (0.1 - (gsf * 0.05)).ToString() + ",";
                lines[44] = "0: " + (gsf1 / 1.5).ToString() + ",";
                lines[45] = "14000: " + (gsf1 / 1.5).ToString() + ",";
                lines[46] = "16000: " + (gsf1).ToString() + ",";
                lines[47] = "44000: " + (gsf1).ToString() + ",";
                lines[48] = "45000: " + (gsf1 * 1.5).ToString() + ",";
                lines[49] = "46000: " + (gsf1 / 1.5).ToString() + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 24; i <= 35; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[31] = "static AmbIntensity " + (0.1 - (gsf * 0.05)).ToString() + ",";
                lines[29] = "static Intensity " + (gsf1 / 1.5).ToString() + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 16; i < 20; i++)
            {

                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[43] = "0: " + (gsf1 / 1.5).ToString() + ",";
                lines[44] = "14000: " + (gsf1 / 1.5).ToString() + ",";
                lines[45] = "16000: " + (gsf1).ToString() + ",";
                lines[46] = "44000: " + (gsf1).ToString() + ",";
                lines[47] = "45000: " + (gsf1 * 1.4).ToString() + ",";
                lines[48] = "46000: " + (gsf1 / 1.5).ToString() + ",";
                lines[58] = "static AmbIntensity " + (0.1 - (gsf * 0.05)).ToString() + ",";
                File.WriteAllLines(DNCfile[i], lines); lines = null;

            }
            for (int i = 20; i < 24; i++)
            {
                Console.WriteLine(i);
                string[] lines = File.ReadAllLines(DNCfile[i]);
                lines[48] = "0: " + (gsf1 / 1.5).ToString() + ",";
                lines[49] = "14000: " + (gsf1 / 1.5).ToString() + ",";
                lines[50] = "16000: " + (gsf1).ToString() + ",";
                lines[51] = "44000: " + (gsf1).ToString() + ",";
                lines[52] = "45000: " + (gsf1 * 1.4).ToString() + ",";
                lines[53] = "46000: " + (gsf1 / 1.5).ToString() + ",";
                lines[63] = "static AmbIntensity " + (0.1 - (gsf * 0.05)).ToString() + ",";
                File.WriteAllLines(DNCfile[i], lines);
                lines = null;

            }            <Button x:Name="achbtn1_Copy21" Content="获取战役" HorizontalAlignment="Right" Margin="0,144,445,0" VerticalAlignment="Top" Width="120" Height="25" RenderTransformOrigin="-0.059,0.553" Background="{x:Null}" Foreground="#A8FFFFFF" BorderBrush="#FFC7C7C7" FontSize="10" MouseEnter="uibtn1_MouseEnter" MouseLeave="uibtn1_MouseLeave" Grid.Column="1" Click="achbtn1_Copy21_Click_1"/>
*/