using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.IO;

	class QConst
	{
        /// <summary>
        /// The line of each doodads
        /// </summary>
    public static string[] DNCfile = new string[111];
    public static string dir_root = "./";

    public static void InitConst() {

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

        DNCfile[0] = dir_root + "environment/dnc/dnclordaeron/dnclordaeronterrain/dnclordaeronterrain.mdl";
        DNCfile[1] = dir_root + "environment/dnc/dnclordaeron/dnclordaeronunit/dnclordaeronunit.mdl";
        DNCfile[2] = dir_root + "environment/dnc/dncashenvale/dncashenvaleunit/dncashenvaleunit.mdl";
        DNCfile[3] = dir_root + "environment/dnc/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl";
        DNCfile[4] = dir_root + "environment/dnc/dncdalaran/dncdalaranterrain/dncdalaranterrain.mdl";
        DNCfile[5] = dir_root + "environment/dnc/dncdalaran/dncdalaranunit/dncdalaranunit.mdl";
        DNCfile[6] = dir_root + "environment/dnc/dncfelwood/dncfelwoodterrain/dncfelwoodterrain.mdl";
        DNCfile[7] = dir_root + "environment/dnc/dncfelwood/dncfelwoodunit/dncfelwoodunit.mdl";
        DNCfile[8] = dir_root + "environment/dnc/dncdungeon/dncdungeonterrain/dncdungeonterrain.mdl";
        DNCfile[9] = dir_root + "environment/dnc/dncdungeon/dncdungeonunit/dncdungeonunit.mdl";
        DNCfile[10] = dir_root + "environment/dnc/dncunderground/dncundergroundterrain/dncundergroundterrain.mdl";
        DNCfile[11] = dir_root + "environment/dnc/dncunderground/dncundergroundunit/dncundergroundunit.mdl";

    }


	}

