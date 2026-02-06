document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Vendor Selection Logic
    const vendorSelect = document.getElementById('vendor-select');
    vendorSelect.addEventListener('change', () => {
        generateSNMP();
        generateVLAN();
        generateInterface();
    });

    // Generator Logic

    // --- SNMP Location ---
    const snmpInputs = ['snmp-org', 'snmp-lat', 'snmp-long'];
    snmpInputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', generateSNMP);

        if (id === 'snmp-org') {
            el.addEventListener('blur', (e) => {
                const val = e.target.value.trim().toUpperCase();
                const regex = /^[A-Z0-9]+-[A-Z0-9]+$/;
                const helper = el.parentElement.querySelector('.helper-text');

                if (val && !regex.test(val)) {
                    el.classList.add('input-error');
                    if (helper) helper.classList.add('error-msg');
                } else {
                    el.classList.remove('input-error');
                    if (helper) helper.classList.remove('error-msg');
                }
            });

            // Also clear error on input
            el.addEventListener('input', () => {
                el.classList.remove('input-error');
                const helper = el.parentElement.querySelector('.helper-text');
                if (helper) helper.classList.remove('error-msg');
            });
        }

        if (id === 'snmp-lat' || id === 'snmp-long') {
            el.addEventListener('blur', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    e.target.value = val.toFixed(5);
                    generateSNMP();
                }
            });
        }
    });

    function generateSNMP() {
        const org = document.getElementById('snmp-org').value.trim().toUpperCase();
        let lat = document.getElementById('snmp-lat').value.trim();
        let long = document.getElementById('snmp-long').value.trim();
        const vendor = vendorSelect.value;

        if (lat) lat = parseFloat(lat).toFixed(5);
        if (long) long = parseFloat(long).toFixed(5);

        // Format: O:<ORGANIZAÇÃO-UNIDADE>|LT:<LATITUDE>|LG:<LONGITUDE>
        let baseOutput = `O:${org}|LT:${lat}|LG:${long}`;
        let finalOutput = baseOutput;
        let contextOutput = '';

        if (vendor === 'huawei') {
            finalOutput = `snmp-agent sys-info location ${baseOutput}`;
            contextOutput = `system-view\n${finalOutput}\nreturn\nsave`;
        } else if (vendor === 'extreme') {
            finalOutput = `configure snmp sysLocation ${baseOutput}`;
            contextOutput = `${finalOutput}\nsave`;
        } else if (vendor === 'juniper') {
            finalOutput = `set system location building ${baseOutput}`;
            contextOutput = `configure\n${finalOutput}\ncommit\nexit`;
        } else if (vendor === 'cisco') {
            finalOutput = `snmp-server location ${baseOutput}`;
            contextOutput = `configure terminal\n${finalOutput}\nend\nwrite memory`;
        } else {
            contextOutput = "Selecione um fabricante para ver os comandos.";
        }

        document.getElementById('snmp-output').innerText = finalOutput;
        document.getElementById('snmp-context').innerText = contextOutput;
    }

    // --- VLAN ---
    const vlanInputs = ['vlan-finality', 'vlan-inst', 'vlan-service', 'vlan-oper', 'vlan-id'];
    vlanInputs.forEach(id => {
        const element = document.getElementById(id);
        if (id === 'vlan-id') {
            element?.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (value > 4094) e.target.value = 4094;
                if (value < 0) e.target.value = 1;
                generateVLAN();
            });
        } else {
            element?.addEventListener('input', generateVLAN);
        }
    });

    function generateVLAN() {
        const finality = document.getElementById('vlan-finality').value;
        const inst = document.getElementById('vlan-inst').value.trim().toUpperCase();
        const service = document.getElementById('vlan-service').value.trim().toUpperCase();
        const oper = document.getElementById('vlan-oper').value.trim().toUpperCase();
        const id = document.getElementById('vlan-id').value.trim();
        const vendor = vendorSelect.value;

        // 3.3 Table Order: FINALITY -> SERVICE -> INST -> OPER -> ID

        let parts = [finality];
        if (service) parts.push(service);
        if (inst) parts.push(inst);
        if (oper) parts.push(oper);
        if (id) parts.push(id);

        // Join with underscores
        const vlanName = parts.join('_');
        let finalOutput = vlanName;
        const vlanIdSafe = id || '<ID>';
        let contextOutput = '';

        if (vendor === 'huawei') {
            finalOutput = `vlan ${vlanIdSafe}\n name ${vlanName}\n description ${vlanName}`;
            contextOutput = `system-view\n${finalOutput}\nreturn\nsave`;
        } else if (vendor === 'extreme') {
            finalOutput = `create vlan ${vlanName}\nconfigure vlan ${vlanName} tag ${vlanIdSafe}`;
            contextOutput = `${finalOutput}\nsave`;
        } else if (vendor === 'juniper') {
            finalOutput = `set vlans ${vlanName} vlan-id ${vlanIdSafe}`;
            contextOutput = `configure\n${finalOutput}\ncommit\nexit`;
        } else if (vendor === 'cisco') {
            finalOutput = `vlan ${vlanIdSafe}\n name ${vlanName}`;
            contextOutput = `configure terminal\n${finalOutput}\nend\nwrite memory`;
        } else {
            contextOutput = "Selecione um fabricante para ver os comandos.";
        }

        document.getElementById('vlan-output').innerText = finalOutput;
        document.getElementById('vlan-context').innerText = contextOutput;
    }

    // --- Interface ---
    const ifInputs = ['if-local', 'if-type', 'if-remote-org', 'if-remote-equip', 'if-remote-if', 'if-service', 'if-internal-id', 'if-bandwidth', 'if-comment'];
    ifInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', generateInterface);
            el.addEventListener('change', generateInterface);
        }
    });

    function generateInterface() {
        const localIf = document.getElementById('if-local').value.trim();
        const type = document.getElementById('if-type').value;
        const org = document.getElementById('if-remote-org').value.trim().toUpperCase();
        const equip = document.getElementById('if-remote-equip').value.trim().toUpperCase();
        const remoteIf = document.getElementById('if-remote-if').value.trim().toUpperCase(); // Allowed: /
        const service = document.getElementById('if-service').value.trim().toUpperCase();
        const internalId = document.getElementById('if-internal-id').value.trim().toUpperCase();
        const bw = document.getElementById('if-bandwidth').value.trim().toUpperCase();
        const comment = document.getElementById('if-comment').value.trim().toUpperCase();
        const vendor = vendorSelect.value;

        const safeLocalIf = localIf || '<INTERFACE_LOCAL>';

        // Format: T:<TYPE>|O:<ORG>|E:<EQUIP>|I:<IF>|S:<SERVICE>|ID:<INTERNAL_ID>|B:<BANDWIDTH>|C:<COMMENT>

        let parts = [];
        parts.push(`T:${type}`);
        parts.push(`O:${org}`);

        if (equip) parts.push(`E:${equip}`);
        if (remoteIf) parts.push(`I:${remoteIf}`);
        if (service) parts.push(`S:${service}`);
        if (internalId) parts.push(`ID:${internalId}`);
        if (bw) parts.push(`B:${bw}`);
        if (comment) parts.push(`C:${comment}`);

        const desc = parts.join('|');
        let finalOutput = desc;
        let contextOutput = '';

        if (vendor === 'huawei') {
            finalOutput = `description ${desc}`;
            contextOutput = `system-view\ninterface ${safeLocalIf}\n${finalOutput}\nreturn\nsave`;
        } else if (vendor === 'extreme') {
            finalOutput = `configure ports ${safeLocalIf} display-string ${desc}`;
            contextOutput = `${finalOutput}\nsave`;
        } else if (vendor === 'juniper') {
            finalOutput = `set interfaces ${safeLocalIf} description "${desc}"`;
            contextOutput = `configure\n${finalOutput}\ncommit\nexit`;
        } else if (vendor === 'cisco') {
            finalOutput = `description ${desc}`;
            contextOutput = `configure terminal\ninterface ${safeLocalIf}\n${finalOutput}\nend\nwrite memory`;
        } else {
            contextOutput = "Selecione um fabricante para ver os comandos.";
        }

        document.getElementById('if-output').innerText = finalOutput;
        document.getElementById('if-context').innerText = contextOutput;
    }

    // Copy Buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.copyTarget;
            const element = document.getElementById(targetId);
            const text = element.innerText; // Use innerText to preserve newlines
            navigator.clipboard.writeText(text).then(() => {
                const originalText = btn.textContent;
                btn.textContent = 'Copiado!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        });
    });

    // Initial Trigger
    generateSNMP();
    generateVLAN();
    generateInterface();
});
