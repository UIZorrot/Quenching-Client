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
using System.Windows.Navigation;
using System.Windows.Forms.Integration;

namespace QuenchingModCN
{


    public partial class Lang : Window
    {





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
        string dir_root = "./";
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

        public Lang()
        {
            if (System.IO.Directory.Exists(".//_retail_")) { dir_root = "./_retail_/"; }
            streamrw("StormLib.dll");
            streamrw("StormLibSharp.dll");
            streamrw("reg.reg");
            streamrw("CASCLib.NET.dll");
            streamrw("ICSharpCode.SharpZipLib.dll");
            streamrw("cfix.w3x");
            if (GetIniInt("mod", "lange", 0) == 1)
            {
                MainWindow isw = new MainWindow(); ElementHost.EnableModelessKeyboardInterop(isw);
                isw.Show();
                this.Close();
            }
        }

        private void button2_Click(object sender, RoutedEventArgs e)
        {

            WriteIniInt("mod", "lang", 0);
            WriteIniInt("mod", "lange", 1);
            Directory.CreateDirectory(dir_root + "webui");
            streamrwDic("index.html", dir_root + "webui/");
            streamrwDic("gluemanager.js", dir_root + "webui/");
             

            MainWindow isw = new MainWindow(); 
            ElementHost.EnableModelessKeyboardInterop(isw);
            isw.Show();
            this.Close();
        }

        private void button2_Copy_Click(object sender, RoutedEventArgs e)
        {
            WriteIniInt("mod", "lang", 1);
            WriteIniInt("mod", "lange", 1);
            Directory.CreateDirectory(dir_root + "webui");
            streamrwDic("index.html", dir_root + "webui/");
            streamrwDic("gluemanager.js", dir_root + "webui/");
             

            MainWindow isw = new MainWindow(); ElementHost.EnableModelessKeyboardInterop(isw);
            isw.Show();
            this.Close();
        }

        private void button2_Copy1_Click(object sender, RoutedEventArgs e)
        {

            Directory.CreateDirectory(dir_root + "webui");
            streamrwDic("index.html", dir_root + "webui/");
            streamrwDic("gluemanager.js", dir_root + "webui/");
             
            WriteIniInt("mod", "lange", 1);
            WriteIniInt("mod", "lang", 2);
            MainWindow isw = new MainWindow(); ElementHost.EnableModelessKeyboardInterop(isw);
            isw.Show();
            this.Close();
        }

        private void button2_Copy2_Click(object sender, RoutedEventArgs e)
        {

            Directory.CreateDirectory(dir_root + "webui");
            streamrwDic("index.html", dir_root + "webui/");
            streamrwDic("gluemanager.js", dir_root + "webui/");
             
            WriteIniInt("mod", "lange", 1);
            WriteIniInt("mod", "lang", 3);
            MainWindow isw = new MainWindow(); ElementHost.EnableModelessKeyboardInterop(isw);
            isw.Show();
            this.Close();
        }

        private void button2_Copy3_Click(object sender, RoutedEventArgs e)
        {

            Directory.CreateDirectory(dir_root + "webui");
            streamrwDic("index.html", dir_root + "webui/");
            streamrwDic("gluemanager.js", dir_root + "webui/");
             
            WriteIniInt("mod", "lange", 1);
            WriteIniInt("mod", "lang", 4);
            MainWindow isw = new MainWindow(); ElementHost.EnableModelessKeyboardInterop(isw);
            isw.Show();
            this.Close();
        }
    }
}