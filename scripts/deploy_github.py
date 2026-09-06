#!/usr/bin/env python3
import subprocess
import os
import zipfile

def run(cmd, cwd=None):
    print(f"--> Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    subprocess.run(cmd, shell=isinstance(cmd, str), cwd=cwd, check=True)

def package_offline_zip():
    print("--> Packaging offline zip: hguard-offline.zip...")
    os.makedirs('public', exist_ok=True)
    os.makedirs('dist', exist_ok=True)
    with open('dist/OFFLINE_START.txt', 'w') as f:
        f.write('HGUARD OFFLINE SURVEILLANCE PACKAGE\n===================================\n\n1. Double click index.html in modern Chrome/Edge/Safari/Firefox.\n2. Or run a simple local web server in this directory:\n   python3 -m http.server 8080\n   or\n   npx serve .\n\n3. Open http://localhost:8080 in your browser.\n\nAll features (3-Camera streams, Multi-view 1-screen monitor, Battery 80% guard, Eco-Cool blackout, Motion detection, Encrypted logs) run offline in your browser!\n')
    
    with zipfile.ZipFile('hguard-offline.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('dist'):
            if '.git' in root:
                continue
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, 'dist')
                zipf.write(full_path, rel_path)
    
    # Mirror into public and dist
    import shutil
    shutil.copyfile('hguard-offline.zip', 'public/hguard-offline.zip')
    shutil.copyfile('hguard-offline.zip', 'dist/hguard-offline.zip')

def main():
    print("=== HGuard Sync to GitHub (main & gh-pages) ===")
    
    # 1. Build
    run(["npm", "run", "build"])
    
    # 2. Package offline zip
    package_offline_zip()
    
    # 3. Commit main branch changes
    run("git add -A")
    res = subprocess.run("git diff-index --quiet HEAD", shell=True)
    if res.returncode != 0:
        run(["git", "commit", "-m", "Auto-update HGuard application"])
    
    # 4. Push main branch
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        remote_url = f"https://sandipy:{token}@github.com/sandipy/Hguard.git"
    else:
        # Use existing git remote
        res = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True)
        remote_url = res.stdout.strip() if res.returncode == 0 else "origin"
    
    run(f"git push {remote_url} main")
    
    # 5. Push gh-pages branch from dist
    dist_git = os.path.join("dist", ".git")
    if os.path.exists(dist_git):
        import shutil
        shutil.rmtree(dist_git)
    
    run(["git", "init"], cwd="dist")
    run(["git", "config", "user.name", "sandipy"], cwd="dist")
    run(["git", "config", "user.email", "drshahenyashpal@gmail.com"], cwd="dist")
    run(["git", "checkout", "-b", "gh-pages"], cwd="dist")
    run(["git", "add", "-A"], cwd="dist")
    run(["git", "commit", "-m", "Deploy to GitHub Pages"], cwd="dist")
    run(f"git push -f {remote_url} gh-pages", cwd="dist")
    
    if os.path.exists(dist_git):
        import shutil
        shutil.rmtree(dist_git)
        
    print("✅ Successfully updated GitHub repository: https://github.com/sandipy/Hguard")
    print("✅ Successfully updated GitHub Pages: https://sandipy.github.io/Hguard/")
    print("✅ Offline package ready: hguard-offline.zip")

if __name__ == "__main__":
    main()
