package_safari:
    pnpm wxt build -b safari
    xcrun safari-web-extension-converter .output/safari-mv2 \
        --macos-only \
        --app-name sneak \
        --bundle-identifier org.rwblickhan.sneak \
        --project-location .output/safari-pkg \
        --no-prompt \
        --force
