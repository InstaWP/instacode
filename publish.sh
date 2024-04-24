#!/bin/bash

# Define the file to check
FILE="extension.js"

# Function to replace the string
replace_string() {
    FILE="extension.js"
    sed -i '' 's/stage.instawp.io/app.instawp.io/g' "$FILE"
    echo "'stage.instawp.io' replaced with 'app.instawp.io' in $FILE"
}

# Check if the file exists
if [ -f "$FILE" ]; then
    # Search for the string "app.instawp.io" in the file
    if grep -q "app.instawp.io" "$FILE"; then
        echo "'app.instawp.io' found in $FILE"
    else
        # Ask the user if it's ok to replace "stage.instawp.io" with "app.instawp.io"
        read -p "'app.instawp.io' not found. Replace 'stage.instawp.io' with 'app.instawp.io'? (y/n): " answer
        case $answer in
            [Yy]* ) replace_string;;
            * ) echo "Operation cancelled. Exiting."; exit 1;;
        esac
    fi
else
    echo "Error: $FILE does not exist."
    exit 1
fi

#vsce package
vsce publish minor
