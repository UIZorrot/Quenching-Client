using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace QuenchingModCN.quenching
{
    class Class1
    {
        /*
                   网络拉取文本
                    DownloadFile(severurl + "trans.que", "./quenching/trans.que");
                    DownloadFile(severurl + "trans-en.que", "./quenching/trans-en.que");
                    DownloadFile(severurl + "hc-trans.que", "./quenching/hc-trans.que");
                    DownloadFile(severurl + "hc-trans-en.que", "./quenching/hc-trans-en.que");

        Stormlib示范
                    //if(StormLib.SFileCreateArchive("1.w3x", 0, 1024, ref i))
            //{ Console.WriteLine("afa"); }
           
            try { } catch { }
            if (DownloadFile(severurl + "mod/sev.que", "./quenching/temp/sev.que"))
            {
                severurl = getonelineque("./quenching/temp/sev.que");
            }
            else
            { }
            
                if (DownloadFile(severurl + "mod/versionclient.que", "./quenching/temp/versionclient.que"))
                { }
                else
                { severurl = "https://code.aliyun.com/ui_zorrot/"; }

                            //try { File.Delete(dir_root + "units/destructableskin.txt"); } catch { }
                    //try { File.Delete(dir_root + "units/unitskin.txt"); } catch { }
                    //try { File.Copy(dir_root + "units/des-old/destructableskin.txt", dir_root + "units/destructableskin.txt", true); } catch { }

        //"D:/Program Files/Warcraft III/_retail_/x86_64/Warcraft III.exe" -launch -loadfile "C:\Users\uizor\AppData\Local\Temp\WorldEditTestMap.w3m" -mapdiff 1  -testmapprofile WorldEdit  -fixedseed 1
//string temp = "https://vip.d0.baidupan.com/file/?B2FTbQk4VWQGD1BoUWRTP1NsVW1RPwY2Cz9SYFQmUygBaAEmCXIAMgQ7CjACM1EPV2QBYF89U2VXYFFhUD1RYwc2UzwJZ1UnBjZQdVE4U2BTP1VgUSgGdAt8UmlUOlNiATMBZwl7AGQEYQpzAmRRYVciATZfMVMyV2FRZFA6UWcHNVMzCTdVZAZjUDJRYFNgUzpVYFFqBjALaFJiVD5TawE2AWEJYgBgBGIKbAI1UWhXbAEqX3pTOFcgUXFQeVEjB2JTdgk9VWUGbVA3UTFTZ1M4VWhRPwY9CypSIFRhUz8BZAEwCWkAZQRkCm0CYFFiVzoBNF8xU2FXZlF5UCJRdgdhU2gJI1U8BmFQMFE0U2RTO1VmUTcGNAs4UmBULlMnAXEBIQlpAGUEZAptAmBRYlc7ATNfNlNiV2FRcVB5UTkHd1M5CWZVMAZpUChRN1NhUzBVflE8BjYLO1J6VDlTYgE1";

//if (DownloadLZFile(temp, "./temp.zip", "https://wwi.lanzous.com/i0Wkfn5gayd"))
//{ }
/*
 *             string cver = "v1.33";
            //Thread thread = new Thread(new ThreadStart(maincheckfile));
            //thread.Start();
            if (DownloadFile(fseverurl + "versionclient.que", "./quenching/versionclient.que"))
            {
                cver = getonelineque("./quenching/versionclient.que");
                if (cver != "v1.33")
                {
                    this.Dispatcher.Invoke(() =>
                    {
                        maincheckt.Text = mainstring[23] + System.Environment.NewLine + cver;
                    });
                    System.Diagnostics.Process.Start("QuenchingUpdateTool.exe");
                    Close();
                }
                else
                { MessageBox.Show(mbtext[11], mbtext[0]); }
            }
            else { MessageBox.Show(mbtext[12], mbtext[0]); }



                public void initmod()
        {
            initnum = 0;
            countfile("./Quenching");
            this.Dispatcher.Invoke(() => { mainbtn_check.IsEnabled = false; });
            this.Dispatcher.Invoke(() => { mainbtn_check_Copy.IsEnabled = false; });
            //this.Dispatcher.Invoke(() => { mainbtn_reset.IsEnabled = false; });

            //joinfiles
            try
            {
                this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Visible; pbp.Value = 0; pbp.Maximum = initnum; });
                //pre-setup
                //all vio files act in -vio, which is init with disabled
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
                DelectDir(dir_root + "campaign");
                //copyfpb("./Quenching/vio/units", dir_root);
                //copyfpb("./Quenching/vio/buildings", dir_root);
                /*copyfpb("./Quenching/vio/doodads", dir_root);
                copyfpb("./Quenching/vio/abilities", dir_root);
                copyfpb("./Quenching/vio/replaceabletextures", dir_root);
                copyfpb("./Quenching/vio/objects", dir_root);
                copyfpb("./Quenching/vio/environment", dir_root);
                copyfpb("./Quenching/vio/sharedfx", dir_root);
                copyfpb("./Quenching/vio/textures", dir_root);
                copyfpb("./Quenching/vio/ui", dir_root);
               
        copyfpb("./Quenching/abilities", dir_root);
        copyfpb("./Quenching/objects", dir_root);
        copyfpb("./Quenching/sharedfx", dir_root);
        copyfpb("./Quenching/sharedmodels", dir_root);
        copyfpb("./Quenching/movies", dir_root);
        copyfpb("./Quenching/environment", dir_root);
        copyfpb("./Quenching/replaceabletextures", dir_root);
        copyfpb("./Quenching/doodads", dir_root);
        copyfpb("./Quenching/buildings", dir_root);
        copyfpb("./Quenching/units", dir_root);
        copyfpb("./Quenching/cos", dir_root);
        copyfpb("./Quenching/qc", dir_root);
        copyfpb("./Quenching/shaders", dir_root);
        copyfpb("./Quenching/textures", dir_root);
        copyfpb("./Quenching/terrainart", dir_root);
        copyfpb("./Quenching/old", dir_root);
        copyfpb("./Quenching/splats", dir_root);
        copyfpb("./Quenching/webui", dir_root);
        copyfpb("./Quenching/half/buildings", dir_root);
        copyfpb("./Quenching/half/units", dir_root);
        copyfpb("./Quenching/campaign", dir_root);
        copyfpb("./Quenching/war3campImported", dir_root);
                if (GetIniInt("mod", "ui", 0) == 0) { copyfpb("./Quenching/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.dds", dir_root + "textures/portrait_bg_diffuse.dds-dis");
    } catch { } }
                if (GetIniInt("mod", "ui", 0) == 1) { copyfpb("./Quenching/ui-que/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.dds-dis", dir_root + "textures/portrait_bg_diffuse.dds"); } catch { } }
if (GetIniInt("mod", "ui", 0) == 2) { copyfpb("./Quenching/ui-blz/ui", dir_root); try { filemove(dir_root + "textures/portrait_bg_diffuse.dds-dis", dir_root + "textures/portrait_bg_diffuse.dds"); } catch { } }

//if (GetIniInt("mod", "camp", 1) == 0) { filemove(dir_root + "ui/campaigninforeforged.txt", dir_root + "ui/campaigninforeforged.txt-dis"); 
//filemove(dir_root + "webui/campaign/reforged-banner.png", dir_root + "webui/campaign/reforged-banner.png-dis");
//filemove(dir_root + "ui/campaigninforeforged.txt");

this.Dispatcher.Invoke(() => { pbp.Value = pbp.Value + 1; pbtext1.Text = ""; pbtext2.Text = mainstring[17]; });

if (GetIniInt("mod", "vio", 0) == 1)
{
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
}

if (GetIniInt("mod", "light", 0) == 1)
{

    dirmove(dir_root + "environment/dnc", dir_root + "environment/dnc45"); dirmove(dir_root + "environment/dncspin", dir_root + "environment/dnc");
}
if (GetIniInt("mod", "foliage", 1) == 0)
{
    dirmove(dir_root + "environment/foliage", dir_root + "environment/foliage-dis");
    //if (GetIniInt("mod", "vio", 1) == 1)
    //{ dirmove(dir_root + "environment/foliage-dis/blight", dir_root + "environment/foliage/blight"); }
}
if (GetIniInt("mod", "water", 0) == 1)
{
    dirmove(dir_root + "replaceabletextures/water", dir_root + "replaceabletextures/water-rel");
    dirmove(dir_root + "replaceabletextures/water-trans", dir_root + "replaceabletextures/water");
}
if (GetIniInt("mod", "selection", 1) == 1)
{ dirmove(dir_root + "replaceabletextures/selection-dis", dir_root + "replaceabletextures/selection"); }
if (GetIniInt("mod", "hg", 0) == 1)
{ filemove(dir_root + "textures/fx/flare/heroglow_bw-dis.dds", dir_root + "textures/fx/flare/heroglow_bw.dds"); }
if (GetIniInt("mod", "shader", 1) == 0)
{
    dirmove(dir_root + "shaders", dir_root + "shaders-dis");
}
               
                if (GetIniInt("mod", "unitchange", 1) == 0)
                {
                    filemove(dir_root + "units/undead/evilarthas/undead_arthasevil_cape_diffuse.dds", dir_root + "units/undead/evilarthas/undead_arthasevil_cape_diffuse-dis.dds");
                    filemove(dir_root + "units/undead/evilarthas/undead_arthasevil_cape_orm.dds", dir_root + "units/undead/evilarthas/undead_arthasevil_cape_orm-dis.dds");
                    filemove(dir_root + "units/nightelf/druidoftheclaw/nightelf_druidoftheclawbear_main_diffuse.dds", dir_root + "units/nightelf/druidoftheclaw/nightelf_druidoftheclawbear_main_diffuse-dis.dds");
                    filemove(dir_root + "units/nightelf/druidoftheclaw/nightelf_druidoftheclawbear_hair_diffuse.dds", dir_root + "units/nightelf/druidoftheclaw/nightelf_druidoftheclawbear_main_diffuse-dis.dds");
                }
                if (GetIniInt("mod", "half", 0) == 1)
                {
                    string line;
                    StreamReader hr = new StreamReader("./quenching/half.que", Encoding.Default);
                    try
                    {
                        while ((line = hr.ReadLine()) != null)
                        {
                            try { filemove(dir_root + line, dir_root + line + "-nom"); } catch { }
                            filemove(dir_root + line + "-half", dir_root + line);
                        }
                        hr.Close();
                    }
                    catch { }
                }
                if (GetIniInt("mod", "old", 0) == 1)
                {
                    dirmove(dir_root + "units", dir_root + "old/units-new");
                    dirmove(dir_root + "buildings", dir_root + "old/buildings-new");
                    dirmove(dir_root + "old/units", dir_root + "units");
                    dirmove(dir_root + "old/buildings", dir_root + "buildings");
                    dirmove(dir_root + "environment/environmentmap", dir_root + "environment/environmentmap-new");
                    if (GetIniInt("mod", "light", 0) == 1)
                    { dirmove(dir_root + "environment/dnc", dir_root + "environment/dncspin"); dirmove(dir_root + "environment/dncspinold", dir_root + "environment/dnc"); }
                    else
                    { dirmove(dir_root + "environment/dnc", dir_root + "environment/dnc45"); dirmove(dir_root + "environment/dnc45old", dir_root + "environment/dnc"); }
                }
                                if (GetIniInt("mod", "old", 0) == 1)
                {
                    try { File.Move(dir_root + "units/unitskin.txt", dir_root + "units/unitskin.txt-new"); } catch { }
                    try { File.Copy(dir_root + "old/units/unitskin.txt", dir_root + "units/unitskin.txt"); } catch { }
                }
                


            }
            catch { }
try
{
    for (int tempi = 0; tempi < 100; tempi++)
    {
        WriteIniInt("coshero", tempi.ToString(), 0);
    }
    WriteIniInt("cosunit", "orc", 0);
    WriteIniInt("cosunit", "hum", 0);
    WriteIniInt("cosunit", "ud", 0);
    WriteIniInt("cosunit", "ne", 0);
    WriteIniInt("gamma", "1", 177);
    WriteIniInt("fog", "1", 1);
    WriteIniInt("fog", "2", 1);
    WriteIniInt("fog", "3", 1);
    WriteIniInt("fog", "4", 5000);
    WriteIniInt("cam", "70", 1);
    WriteIniInt("cam", "304", 1);
    //File.Copy("./Quenching/unitskin.txt", dir_root + "units/unitskin.txt", true);
    //File.Copy("./Quenching/scripts/blizzard.j", dir_root + "scripts/blizzard.j", true);
}
catch { }
//File.Copy("./Quenching/fileio/unitskin.txt", dir_root + "units/unitskin.txt");
this.Dispatcher.Invoke(() => { pb.Visibility = Visibility.Hidden; pbp.Value = 0; pbtext1.Text = ""; pbtext2.Text = mainstring[19]; });
this.Dispatcher.Invoke(() => { mainbtn_check.IsEnabled = true; });
this.Dispatcher.Invoke(() => { mainbtn_check_Copy.IsEnabled = true; });
// this.Dispatcher.Invoke(() => { mainbtn_reset.IsEnabled = true; });
//DelectDir(dir_root + "Quenching");
this.Dispatcher.Invoke(() =>
{
    if (!File.Exists(dir_root + "webui/QuenchingOn.png"))
    { maincheckt.Text = mainstring[25] + System.Environment.NewLine + cver; }
    else
    { maincheckt.Text = mainstring[26] + System.Environment.NewLine + cver; }

});
        }

            */

    }
}
