using System;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace WFChangeKey
{
    class KeyboardHook
    {
        private const int WM_KEYDOWN = 0x100;//按下消息
        private const int WM_KEYUP = 0x101;//松开消息
        private const int WM_SYSKEYDOWN = 0x104;
        private const int WM_SYSKEYUP = 0x105;
        public event KeyEventHandler OnKeyDownEvent;
        public event KeyEventHandler OnKeyUpEvent;
        public event KeyPressEventHandler OnKeyPressEvent;
        private static int hKeyboardHook = 0;
        public const int WH_KEYBOARD_LL = 13;
        public delegate int HookProc(int nCode, Int32 wParam, IntPtr lParam);

        private HookProc keyboardHookProc;

        [StructLayout(LayoutKind.Sequential)]
        public class KeyboardHookStruct
        {
            public int vkCode;
            public int scanCode;
            public int flags;
            public int time;
        }
        //安装钩子
        [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
        public static extern int SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hInstance, int threadId);
        //下一个钩子
        [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
        public static extern int CallNextHookEx(int idHook, int nCode, Int32 wParam, IntPtr lParam);
        //卸载钩子
        [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
        public static extern bool UnhookWindowsHookEx(int idHook);

        private int KeyboardHookProc(int nCode, Int32 wParam, IntPtr lParam)
        {
            try
            {
                if ((nCode >= 0) && ((OnKeyDownEvent != null) || (OnKeyPressEvent != null) || (OnKeyUpEvent != null)))
                {
                    KeyboardHookStruct myKeyboardHookStruct =
                        (KeyboardHookStruct)Marshal.PtrToStructure(lParam, typeof(KeyboardHookStruct));
                    if (OnKeyDownEvent != null && (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN))
                    {
                        Keys keyData = (Keys)myKeyboardHookStruct.vkCode;
                        KeyEventArgs e = new KeyEventArgs(keyData);
                        OnKeyDownEvent(this, e);
                    }
                }
            }
            catch { }
            return CallNextHookEx(hKeyboardHook, nCode, wParam, lParam);
        }

        public void Start()
        {
            if (hKeyboardHook == 0)
            {
                keyboardHookProc = new HookProc(KeyboardHookProc);
                using (System.Diagnostics.Process curProcess = System.Diagnostics.Process.GetCurrentProcess())
                using (System.Diagnostics.ProcessModule curModule = curProcess.MainModule)
                    hKeyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, keyboardHookProc,
                        GetModule(curModule.ModuleName), 0);
                if (hKeyboardHook == 0)
                {
                    Stop();
                    throw new Exception("找不到对应句柄！");
                }
            }
        }

        private IntPtr GetModule(string name)
        {
            Module m = null;
            Module[] modules = Assembly.GetExecutingAssembly().GetModules();
            foreach (var module in modules)
            {
                if (module.Name == name)
                    m = module;
            }
            return Marshal.GetHINSTANCE(m);
        }


        public void Stop()
        {
            bool retKeyboard = true;
            if (hKeyboardHook != 0)
            {
                retKeyboard = UnhookWindowsHookEx(hKeyboardHook);
                hKeyboardHook = 0;
            }
            if (!retKeyboard)
            {
                throw new Exception("关闭程序失败！");
            }
        }

        public KeyboardHook()
        {
            Start();
        }

        ~KeyboardHook()
        {
            Stop();
        }
    }
}