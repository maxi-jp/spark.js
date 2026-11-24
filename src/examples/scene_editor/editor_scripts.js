// =====================================================================
// spark.js Scene Editor — Script Manager, Schema Parser & Code Modal
// =====================================================================

const EditorScripts = {
    _editingScriptName: null,

    TEMPLATES: {
        blank: (name) => `class ${name} extends Behavior {
    static inspector = {
        speed: { type: "number", default: 100, min: 0, max: 600 }
    };

    Start() {
        // Called once when the scene starts
    }

    Update(dt) {
        // Called every frame
    }
}
ScriptRegistry.Register("${name}", ${name});`,

        topDownPlayer: (name) => `class ${name} extends Behavior {
    static inspector = {
        speed:          { type: "number", default: 220, min: 40, max: 600, step: 10 },
        dashMultiplier: { type: "number", default: 1.8, min: 1, max: 4, step: 0.1 }
    };

    Update(dt) {
        const mx = Input.GetAxis("MoveX");
        const my = Input.GetAxis("MoveY");
        const mult = Input.GetAction("Dash") ? this.dashMultiplier : 1;
        this.x += mx * this.speed * mult * dt;
        this.y += my * this.speed * mult * dt;
    }
}
ScriptRegistry.Register("${name}", ${name});`,

        patrol: (name) => `class ${name} extends Behavior {
    static inspector = {
        speed:    { type: "number", default: 120, min: 10, max: 500 },
        distance: { type: "number", default: 120, min: 10, max: 600 },
        axis:     { type: "select", default: "x", options: ["x", "y"] }
    };

    Start() {
        this.startX = this.x;
        this.startY = this.y;
        this.dir = 1;
    }

    Update(dt) {
        if (this.axis === "x") {
            this.x += this.speed * this.dir * dt;
            if (Math.abs(this.x - this.startX) >= this.distance) this.dir *= -1;
        } else {
            this.y += this.speed * this.dir * dt;
            if (Math.abs(this.y - this.startY) >= this.distance) this.dir *= -1;
        }
    }
}
ScriptRegistry.Register("${name}", ${name});`,

        collectible: (name) => `class ${name} extends Behavior {
    static inspector = {
        points: { type: "number", default: 10, min: 1, max: 500 },
        targetTag: { type: "string", default: "player" }
    };

    OnCollisionEnter(myCol, otherCol) {
        if (otherCol.go && otherCol.go.tag === this.targetTag) {
            console.log("Collected! +" + this.points + " pts");
            this.game.Destroy(this.go);
        }
    }
}
ScriptRegistry.Register("${name}", ${name});`,

        spawner: (name) => `class ${name} extends Behavior {
    static inspector = {
        prefabId: { type: "prefabId", default: "" },
        interval: { type: "number", default: 2.0, min: 0.2, max: 30, step: 0.1 }
    };

    Start() {
        if (this.prefabId) {
            this.InvokeRepeating(this.SpawnOne, this.interval, this.interval);
        }
    }

    SpawnOne() {
        if (this.game && typeof this.game.SpawnPrefab === "function") {
            this.game.SpawnPrefab(this.prefabId, { x: this.x, y: this.y });
        }
    }
}
ScriptRegistry.Register("${name}", ${name});`,

        box2dImpulse: (name) => `class ${name} extends Behavior {
    static inspector = {
        jumpImpulse: { type: "number", default: 8, min: 1, max: 30 },
        moveForce:   { type: "number", default: 18, min: 1, max: 60 }
    };

    Update(dt) {
        const mx = Input.GetAxis("MoveX");
        if (mx !== 0) this.go.ApplyForce(mx * this.moveForce, 0);
        if (Input.GetActionDown("Jump")) this.go.ApplyImpulse(0, this.jumpImpulse);
    }
}
ScriptRegistry.Register("${name}", ${name});`
    },

    /**
     * Safely evaluates a Behavior script in an isolated function scope to extract
     * its class name and `static inspector` schema without polluting `window`.
     */
    ParseScriptSchema(code, fallbackName = 'CustomScript') {
        const captured = new Map();
        const stubRegistry = {
            Register(nameOrClass, cls) {
                if (typeof nameOrClass === 'function') captured.set(nameOrClass.name, nameOrClass);
                else if (typeof nameOrClass === 'string' && typeof cls === 'function') captured.set(nameOrClass, cls);
            }
        };

        try {
            // Detect declared class names extending Behavior so even scripts without Register() parse
            const classMatches = Array.from(code.matchAll(/class\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+extends\s+Behavior/g));
            const extraExports = classMatches.map(m => `if (typeof ${m[1]} === 'function') ScriptRegistry.Register("${m[1]}", ${m[1]});`).join('\n');

            const fn = new Function('Behavior', 'ScriptRegistry', 'Vector2', 'Color', 'Input', `${code}\n${extraExports}`);
            fn(Behavior, stubRegistry, Vector2, Color, typeof Input !== 'undefined' ? Input : {});

            if (captured.size > 0) {
                const firstKey = captured.keys().next().value;
                const cls = captured.get(firstKey);
                return {
                    className: firstKey,
                    schema: (cls && cls.inspector && typeof cls.inspector === 'object') ? cls.inspector : {},
                    error: null
                };
            }
            return { className: fallbackName, schema: {}, error: null };
        }
        catch (err) {
            return { className: fallbackName, schema: {}, error: err.message || String(err) };
        }
    },

    SetScript(name, code, path = null) {
        const parsed = this.ParseScriptSchema(code, name);
        const finalName = parsed.className || name;
        const scriptPath = path || `scripts/${finalName}.js`;

        EditorState.scripts[finalName] = {
            id: finalName,
            path: scriptPath,
            code,
            schema: parsed.schema,
            error: parsed.error
        };

        // Ensure entry exists in scene.assets.scripts
        if (EditorState.scene) {
            if (!Array.isArray(EditorState.scene.assets.scripts)) EditorState.scene.assets.scripts = [];
            const exists = EditorState.scene.assets.scripts.find(s => s.id === finalName);
            if (!exists) {
                EditorState.scene.assets.scripts.push({ id: finalName, path: scriptPath });
            }
            else {
                exists.path = scriptPath;
            }
        }

        return EditorState.scripts[finalName];
    },

    DeleteScript(name) {
        delete EditorState.scripts[name];
        if (EditorState.scene?.assets?.scripts) {
            EditorState.scene.assets.scripts = EditorState.scene.assets.scripts.filter(s => s.id !== name);
        }
        EditorState.Emit('scripts');
    },

    BuildDefaultProps(className) {
        const schema = EditorState.scripts[className]?.schema || {};
        const props = {};
        for (const [k, field] of Object.entries(schema)) {
            if (field && field.default !== undefined) {
                props[k] = field.default;
            }
        }
        return props;
    },

    // ── Code Editor Modal ────────────────────────────────────

    InitModal() {
        const modal   = document.getElementById('script-modal');
        const nameInp = document.getElementById('script-modal-name');
        const codeEl  = document.getElementById('script-code-area');
        const tplSel  = document.getElementById('script-template-select');
        const status  = document.getElementById('script-parse-status');

        // Support Tab indentation inside textarea
        codeEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeEl.selectionStart;
                const end = codeEl.selectionEnd;
                codeEl.value = codeEl.value.slice(0, start) + '    ' + codeEl.value.slice(end);
                codeEl.selectionStart = codeEl.selectionEnd = start + 4;
            }
        });

        // Live syntax/schema check while typing
        codeEl.addEventListener('input', () => {
            const parsed = this.ParseScriptSchema(codeEl.value, nameInp.value.trim() || 'MyBehavior');
            if (parsed.error) {
                status.textContent = `Syntax Error: ${parsed.error}`;
                status.className = 'parse-status error';
            }
            else {
                const count = Object.keys(parsed.schema).length;
                status.textContent = `✓ Parsed class "${parsed.className}" (${count} inspector field${count === 1 ? '' : 's'})`;
                status.className = 'parse-status';
            }
        });

        tplSel.addEventListener('change', () => {
            const tplKey = tplSel.value;
            if (!tplKey || !this.TEMPLATES[tplKey]) return;
            const clsName = (nameInp.value.trim() || 'MyBehavior').replace(/[^A-Za-z0-9_$]/g, '');
            codeEl.value = this.TEMPLATES[tplKey](clsName);
            codeEl.dispatchEvent(new Event('input'));
            tplSel.value = '';
        });

        document.getElementById('btn-script-save').addEventListener('click', async () => {
            const rawName = (nameInp.value.trim() || 'MyBehavior').replace(/[^A-Za-z0-9_$]/g, '');
            const code = codeEl.value;
            const entry = this.SetScript(rawName, code);

            // If renamed from an older script name, clean up old key
            if (this._editingScriptName && this._editingScriptName !== entry.id) {
                delete EditorState.scripts[this._editingScriptName];
            }

            // If local folder is open, save directly to scripts/<name>.js
            if (EditorState.folderHandle) {
                await EditorProjectIO.WriteScriptToFolder(entry.path, code);
            }

            modal.style.display = 'none';
            EditorState.Emit('scripts');
            SceneEditorUI.ShowToast(entry.error ? `Saved with syntax warning: ${entry.error}` : `Saved script "${entry.id}"`);
        });

        document.getElementById('btn-script-download').addEventListener('click', () => {
            const rawName = (nameInp.value.trim() || 'MyBehavior').replace(/[^A-Za-z0-9_$]/g, '');
            EditorProjectIO.DownloadText(`${rawName}.js`, codeEl.value, 'text/javascript');
        });

        document.getElementById('btn-script-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    },

    OpenModal(scriptName = null) {
        const modal   = document.getElementById('script-modal');
        const nameInp = document.getElementById('script-modal-name');
        const codeEl  = document.getElementById('script-code-area');

        this._editingScriptName = scriptName;
        if (scriptName && EditorState.scripts[scriptName]) {
            nameInp.value = scriptName;
            codeEl.value  = EditorState.scripts[scriptName].code;
        }
        else {
            const freshName = `CustomBehavior${Object.keys(EditorState.scripts).length + 1}`;
            nameInp.value = freshName;
            codeEl.value  = this.TEMPLATES.blank(freshName);
        }

        modal.style.display = 'flex';
        codeEl.dispatchEvent(new Event('input'));
        codeEl.focus();
    }
};
