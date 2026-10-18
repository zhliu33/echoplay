pkgname=echoplay
pkgver=0.1.0
pkgrel=1
pkgdesc="A Tauri local music player"
arch=('x86_64')
url="https://github.com/zhliu33/echoplay"
license=('MIT')
depends=('gtk3' 'webkit2gtk-4.1' 'alsa-lib')
makedepends=('rust' 'cargo' 'nodejs' 'npm' 'base-devel')
provides=("$pkgname")
source=("$pkgname-$pkgver.tar.gz")
sha256sums=('SKIP')

build() {
  cd "$pkgname-$pkgver"

  export RUSTUP_TOOLCHAIN=stable

  # 生成前端静态资源（tsc + vite build → ../build）
  npm ci
  npm run build

  # 编译 Rust 后端，产出 target/release/EchoPlay
  cd src-tauri
  cargo build --release --locked
}

package() {
  cd "$pkgname-$pkgver"

  # 主程序（Tauri 可执行名由 tauri.conf.json 的 mainBinaryName 决定为 EchoPlay）
  install -Dm755 "src-tauri/target/release/EchoPlay" \
    "$pkgdir/usr/bin/$pkgname"

  # 桌面入口（位于源码根目录）
  install -Dm644 -t "$pkgdir/usr/share/applications" \
    "echoplay.desktop"

  # 图标（位于 src-tauri/icons）
  install -Dm644 "src-tauri/icons/128x128.png" \
    "$pkgdir/usr/share/icons/hicolor/128x128/apps/$pkgname.png"
}