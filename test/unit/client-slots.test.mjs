import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** 以最小浏览器桩执行 lib/client.js，拿到模块表注册项。 */
function loadClient() {
  const src = readFileSync(resolve(root, "lib", "client.js"), "utf8");
  let definition;
  const windowStub = {
    __ModuleLoader__: { load: (def) => { definition = def; } },
  };
  const navigatorStub = { language: "zh-CN" };
  const documentStub = {
    getElementById: () => null,
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: () => {} },
  };
  new Function("window", "navigator", "document", src)(windowStub, navigatorStub, documentStub);
  assert.ok(definition, "client 必须向模块表注册");
  return definition;
}

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (init) => [typeof init === "function" ? init() : init, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useRef: (value) => ({ current: value }),
  useMemo: (fn) => fn(),
};

/** 执行 apply，记录 slots.inject 与 register 的入参。 */
function applyClient(definition) {
  const slots = [];
  const registered = [];
  const ctx = {
    slots: {
      inject: (name, callback) => {
        slots.push(name);
        return callback ? callback() : undefined;
      },
      register: (descriptor) => {
        registered.push(descriptor);
        return () => {};
      },
    },
  };
  const dispose = definition.factory(() => reactStub).apply(ctx);
  return { slots, registered, dispose };
}

test("Desktop 载体：只注册 settings.section，不占侧栏", () => {
  globalThis.dshDesktop = { protocolVersion: 1 };
  try {
    const app = applyClient(loadClient());
    assert.deepEqual(app.slots, ["settings.section"], "Desktop 不应再注册侧栏/主面板");
    assert.equal(app.registered[0].name, "settings.section");
    assert.equal(app.registered[0].id, "opencode-bridge");
    assert.equal(app.registered[0].label(), "OpenCode Bridge");
    assert.equal(typeof app.dispose, "function", "apply 必须返回卸载函数");
    app.dispose();
  } finally {
    delete globalThis.dshDesktop;
  }
});

test("Web（无桌面载体）：保持 sidebar.panellist + main", () => {
  delete globalThis.dshDesktop;
  const app = applyClient(loadClient());
  assert.deepEqual(app.slots, ["sidebar.panellist", "main"]);
  assert.equal(app.registered[0].name, "sidebar.panellist");
  assert.equal(app.registered[1].name, "main");
  app.dispose();
});
