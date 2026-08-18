// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const SFTPClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios'); // Include axios at the top of your file

// Global map to track opened SFTP files
const openedSftpFiles = new Map();

let isFtpConnected = false;

class SftpTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        // Add a rootPath property
        this.rootPath = '';
        this.treeView = null;
        // this.treeView = vscode.window.createTreeView('sftpExplorer', { treeDataProvider: this });
    }

    setTreeView(treeView) {
        this.treeView = treeView;
    }

    getTreeItem(element) {
        if (element.collapsibleState === vscode.TreeItemCollapsibleState.None) {
            // This is a file, set the command to open it when clicked
            element.command = {
                command: 'instacode.openFile',
                title: "Open File",
                arguments: [element.resourceUri]
            };
        }
        return element;
    }

	async openFile(fileUri) {
        try {
            const localPath = await this.downloadFile(fileUri);

			// Store the mapping between the local file and the SFTP file path
            // openedSftpFiles.set(localPath, fileUri.path);

            const document = await vscode.workspace.openTextDocument(localPath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening file: ${error.message}`);
        }
    }

	async downloadFile(fileUri) {
        try {
            // Determine the local temporary directory
            const tempDir = os.tmpdir();
            // Extract the file name from the URI
            const fileName = path.basename(fileUri.path);
            // Create a local path for the file
            const localPath = path.join(tempDir, fileName);

            // Use the SFTP client to download the file
            await sftp.fastGet(fileUri.path, localPath);

            const normalPath = normalizePath(localPath);
            // Store the mapping between the local file and the SFTP file path along with relative path
            openedSftpFiles.set(normalPath, { serverPath: fileUri.path, relativePath: fileUri.path });


            return localPath;

        } catch (error) {
            vscode.window.showErrorMessage(`Error downloading file: ${error.message}`);
            throw error; // Rethrow the error to handle it in the caller function
        }
    }

    getChildren(element) {
        if (!element) {
            // If no element is provided, you're at the root.
            // Fetch root directory listings from your SFTP server.
            return this.rootPath ? this.fetchChildren({ resourceUri: vscode.Uri.file(this.rootPath) }) : this.fetchRoot();
        }
        // If an element is provided, fetch its children.
        return this.fetchChildren(element);
    }

    async fetchRoot() {
        // Logic to fetch the root directory listings.
        // Convert the result into an array of vscode.TreeItem objects.
		try {
            // Assuming you're already connected to the SFTP server.
            // If not, you'll need to connect first.

            const list = await sftp.list('/');  // Fetch the root directory listing

            list.sort((a, b) => a.name.localeCompare(b.name));

            // Convert the fetched list into vscode.TreeItem objects
            return list.map(item => {
                const treeItem = new vscode.TreeItem(item.name);

				// treeItem.path = '/' + item.name;

                // If the item is a directory, indicate it can be expanded.
                if (item.type === 'd') {
                    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                    treeItem.contextValue = 'folder';  // Set context value for folders
                } else {
                    treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
                }

                // Optionally set context values, icons, etc. for the tree item.
				treeItem.resourceUri = vscode.Uri.file(`${item.name}`);
                // treeItem.resourceUri = vscode.Uri.parse(`iwp-sftp://${item.name}`);

                return treeItem;
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching SFTP root: ${error.message}`);
            return [];  // Return an empty array on error
        }
    }

    async fetchChildren(element) {
		if (!element) {
			// If no element is provided, just return an empty array.
			return [];
		}
		
		try {

			//find out the path of the element
			const directoryPath = element.resourceUri.path;
		
			const list = await sftp.list(directoryPath); // Fetch the directory listing

            list.sort((a, b) => a.name.localeCompare(b.name));
	
			// Convert the fetched list into vscode.TreeItem objects
			return list.map(item => {
				const treeItem = new vscode.TreeItem(item.name);
	
				// If the item is a directory, indicate it can be expanded.
				if (item.type === 'd') {
					treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                    treeItem.contextValue = 'folder';  // Set context value for folders
				} else {
					treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
				}
	
				// Optionally set the resourceUri property, context values, icons, etc. for the tree item.
				treeItem.resourceUri = vscode.Uri.file(`${directoryPath}/${item.name}`);
	
				return treeItem;
			});
	
		} catch (error) {
			vscode.window.showErrorMessage(`Error fetching SFTP directory: ${error.message}`);
			return [];  // Return an empty array on error
		}
	}

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    

    async openFolderAtPath(path) {
        const segments = path.split('/').filter(p => p); // Remove any empty segments
        let currentParent = null; // Keep track of the current parent element

        for (const segment of segments) {
            try {
                // Dynamically fetch the children based on the current parent
                const children = await this.getChildren(currentParent);
                // Find the child that matches our current segment
                const childToReveal = children.find(child => child.label === segment);
                if (childToReveal) {
                    // Use the treeView.reveal() method to expand and reveal the child item
                    await sftpProvider.treeView.reveal(childToReveal, { expand: 1, focus: true, select: true });
                    currentParent = childToReveal; // Update the current parent to the revealed child for the next iteration
                } else {
                    throw new Error(`Folder "${segment}" not found in the current context`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error navigating to folder: ${error.message}`);
                break; // Exit the loop on error
            }
        }
    }

    getParent(element) {
        // Implement logic to find the parent of the provided element, actual implementation below:
        

        if (!element || !element.resourceUri || element.resourceUri.path === this.rootPath) {
            // If there's no element, or it's the root, return undefined
            return undefined;
        }

        const path = element.resourceUri.path;
        const parentPath = require('path').dirname(path);

        // Assuming you have a method to find an element by its path
        // This is a simplistic approach; your actual implementation might differ.
        const parentElement = this.findElementByPath(parentPath);
        return parentElement;

    }

    // A placeholder for a method to find an element by its path.
    // You will need to implement this based on how you're managing your tree's data.
    findElementByPath(path) {
        // Implement logic to find and return an element by its path
        // This is just a placeholder and won't work without actual implementation.
        return undefined; // Placeholder
    }
	

    // Other necessary methods.
}

const sftpProvider = new SftpTreeDataProvider();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('instacode.connectSFTP', () => {
        //vscode.commands.executeCommand('vscode.hideFoldersExplorer');
        vscode.window.showInputBox({prompt: 'Enter the InstaWP access key for site'}).then((accessKey) => {
            connectSFTP(accessKey);
        });
        
		
	});

	context.subscriptions.push(disposable);

	let openFileDisposable = vscode.commands.registerCommand('instacode.openFile', (fileUri) => {
        sftpProvider.openFile(fileUri);
    });

	context.subscriptions.push(openFileDisposable);

    // Event listener for saving documents
	vscode.workspace.onDidSaveTextDocument(document => {
		if (isSftpDocument(document)) {
            saveChangesToSftpServer(document);
        }
    });

     // create new file command
     context.subscriptions.push(vscode.commands.registerCommand('instacode.createNewFile', async (treeItem) => {
        const directoryPath = treeItem.resourceUri.path;

        // Prompt the user to enter a file name
        const fileName = await vscode.window.showInputBox({
            prompt: 'New File Name',
            ignoreFocusOut: true
        });

        if (fileName) {
            try {
                // Create the new file
                await createNewFile(directoryPath, fileName);
                // Refresh the treeview if necessary
                sftpProvider.refresh();
                vscode.window.showInformationMessage(`New file created: ${fileName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error creating file: ${error.message}`);
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('instacode.uploadFile', async (treeItem) => {
        // treeItem contains the context of the folder that was right-clicked
        const targetFolder = treeItem.resourceUri.path;
    
        // Let the user select a file
        const fileUri = await vscode.window.showOpenDialog({ canSelectMany: false });
        if (fileUri && fileUri[0]) {
            // Perform the upload
            await uploadFileToSftp(fileUri[0].fsPath, targetFolder);
            // Refresh the treeview if necessary
            sftpProvider.refresh();
        }
    }));

    // refresh command
    let refreshCommandDisposable = vscode.commands.registerCommand('instacode.refreshSftpExplorer', () => {
        sftpProvider.refresh();
        vscode.window.showInformationMessage('InstaWP Explorer refreshed');
    });

    context.subscriptions.push(refreshCommandDisposable);


    //new Folder function
    let createFolderDisposable = vscode.commands.registerCommand('instacode.createFolder', async (treeItem) => {
        const folderPath = treeItem.resourceUri.path;

        // Prompt the user to enter a folder name
        const folderName = await vscode.window.showInputBox({
            prompt: 'New Folder Name',
            ignoreFocusOut: true
        });

        if (folderName) {
            try {
                // Create the new folder
                await createNewFolder(folderPath, folderName);
                // Refresh the treeview if necessary
                sftpProvider.refresh();
                vscode.window.showInformationMessage(`New folder created: ${folderName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error creating folder: ${error.message}`);
            }
        }
    });

    context.subscriptions.push(createFolderDisposable);

    //deep linkng
    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri(uri) {
            const params = new URLSearchParams(uri.query);
            if(params.has('access_key')) {
                const accessKey = params.get('access_key');
                connectSFTP(accessKey);
            }

        }
    }));
}

const sftp = new SFTPClient();
const ssh = new Client();

async function connectSFTP(accessKey) {

        if(isFtpConnected) {
            //ask if you want to disconnect and connect 
            const response = await vscode.window.showInformationMessage('You are already connected to an InstaWP site. Do you want to disconnect and connect to a new site?', 'Yes', 'No');
            if(response === 'Yes') {
                sftp.end();
            } else {
                return;
            }
        }


        const apiUrl = `https://app.instawp.io/api/v2/sites/sftp-status-with-key`;
        
        // Set headers
        const headers = {
            // 'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        axios.post(apiUrl, {
            key: accessKey,
            status: 1
        }, { headers })
        .then(response => {
            // Handle success
            vscode.window.showInformationMessage('InstaWP Site identified. Connecting to site...', { modal: false });
            const sftpDetails = response.data;
            connectToServer(sftpDetails.host, sftpDetails.port, sftpDetails.username, sftpDetails.password, sftpDetails.site_dir);
        })
        .catch(error => {
            // Handle error
            console.error(error);
            vscode.window.showErrorMessage('Error connecting to InstaWP site. Please check your access key and try again');
        });



}

async function connectToServer(host, port, user, password, siteDir) {
    await sftp.connect({
		host,
		port,
		username: user,
		password,
	}).then(() => {
		// If sftp.cwd() returns a promise (most likely it doesn't), 
		// then just return it directly.
        // open this path '/home/' + user + '/web/' + host + '/public_html'
        // return sftp.
        return sftp.list('/');
    }).then(currentDir => {
        vscode.window.showInformationMessage('Connected to InstaWP site', { modal: false });
    	// vscode.window.registerTreeDataProvider('sftpExplorer', sftpProvider);

        const treeView = vscode.window.createTreeView('sftpExplorer', { treeDataProvider: sftpProvider });
        sftpProvider.setTreeView(treeView); // Pass the TreeView to the SftpTreeDataProvider
    
        //check if currentDir has a folder 'web'
        const webFolder = currentDir.find(item => item.name === 'web' && item.type === 'd');

        // `host` is the SFTP connection target, not the directory name -- the two
        // only coincide on some sites. The directory is named after the site's
        // subdomain, which the API returns as `site_dir`; fall back to `host` for
        // an API that predates that field.
        // Jailed users are chrooted to their home, so the jail root IS the home dir.
        const rootPath = webFolder ? '/web/' + (siteDir || host) : '/' ;
        
        // Set the root of your tree data provider to the specific directory
        sftpProvider.rootPath = rootPath;

        // // Refresh the tree view to show the contents of the directory
        sftpProvider.refresh();
       
        // ssh.on('ready', () => {
        //     console.log('SSH Client :: ready');
        //     ssh.shell((err, stream) => {
        //         if (err) throw err;

        //         // Integrate with VS Code Terminal
        //         const terminal = vscode.window.createTerminal({ name: "InstaWP Terminal" });
        //         terminal.show();

        //         stream.on('data', (data) => {
        //             terminal.sendText(data.toString());
        //         }).stderr.on('data', (data) => {
        //             terminal.sendText(data.toString());
        //         });

        //         // Handle user input from terminal
        //         terminal.onDidWriteData((data) => {
        //             stream.write(data);
        //         });

        //         stream.on('close', () => {
        //             console.log('SSH Stream closed');
        //             terminal.dispose();
        //             ssh.end();
        //         });
        //     });
        // }).on('error', (err) => {
        //     console.error(`SSH Client Error: ${err}`);
        // }).on('end', () => {
        //     console.log('SSH Client end');
        // }).on('close', () => {
        //     console.log('SSH Client closed');
        // }).connect({
        //     host,
		//     port,
		//     username: user,
		//     password,
        // });
        

        isFtpConnected = true;
	}).catch(err => {
		console.log(err, 'catch error');
	});
	
}

// This function checks if the document was opened from the SFTP server
function isSftpDocument(document) {
    // Implement logic to determine if the document is from the SFTP server
    // read the opensftpfiles map and check if the document.uri.fsPath is present in the map
    const normalPath = normalizePath(document.uri.fsPath);
    return openedSftpFiles.has(normalPath);
}

function normalizePath(filePath) {
    return path.normalize(filePath).toLowerCase(); // Normalize and convert to lower case for consistency
}

// Implement the createNewFile function
async function createNewFile(parentFolderPath, fileName) {
    const newFilePath = (path.join(parentFolderPath, fileName)).replace(/\\/g, '/')

    try {
        // Create the new file on the SFTP server
        await sftp.put(Buffer.from(''), newFilePath);

        // Download the file to a temporary local path
        const localPath = await sftpProvider.downloadFile(vscode.Uri.file(newFilePath));

        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(localPath);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        throw new Error(`Failed to create file: ${error.message}`);
    }
}

async function saveChangesToSftpServer(document) {
    try {
        // Retrieve the server and relative paths
        const normalPath = normalizePath(document.uri.fsPath);
        const paths = openedSftpFiles.get(normalPath);
        if (!paths) {
            throw new Error("File is not from the SFTP server.");
        }
        const { serverPath, relativePath } = paths;

        // Read the contents of the document
        const content = document.getText();

        // Save the content back to the SFTP server
        await sftp.put(Buffer.from(content), serverPath);

        vscode.window.showInformationMessage(`Changes saved to SFTP server: ${relativePath}`, { modal: false });
    } catch (error) {
        vscode.window.showErrorMessage(`Error saving changes to SFTP server: ${error.message}`);
    }
}


// Function to handle file upload
async function uploadFileToSftp(localFilePath, targetFolder) {
    try {
        // Get the file name
        const fileName = path.basename(localFilePath);
        // Combine with the target folder path
        const remoteFilePath = path.join(targetFolder, fileName).replace(/\\/g, '/');
        // Perform the upload
        await sftp.put(localFilePath, remoteFilePath);
        vscode.window.showInformationMessage(`File uploaded: ${remoteFilePath}`, { modal: false });
    } catch (error) {
        vscode.window.showErrorMessage(`Error uploading file: ${error.message}`, { modal: false });
    }
}

async function createNewFolder(parentFolderPath, folderName) {
    const newFolderPath = path.join(parentFolderPath, folderName).replace(/\\/g, '/');

    try {
        // Create the new folder on the SFTP server
        await sftp.mkdir(newFolderPath, true); // The second parameter 'true' creates parent directories if they don't exist
    } catch (error) {
        throw new Error(`Failed to create folder: ${error.message}`);
    }
}


// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
