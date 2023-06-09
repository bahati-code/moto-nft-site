import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { faArrowAltCircleRight, faCaretSquareUp, faCog } from "@fortawesome/free-solid-svg-icons";
import {  getContractAddress, getProvider } from 'src/app.config';
import { WalletService } from 'src/app/Services/BlockchainServices\
/wallet.service';
import { FileManagerService } from 'src/app/Services/file-manager.service';
import { NFTManagerService } from '../Services/nft-manager.service';
import { NFT } from 'src/declaration';
import { ProfileService } from '../Services/profile.service';
import { Observable, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { LoginComponent } from '../login/login.component';
import { UniversalDialogComponent } from '../universal-dialog/universal-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TransactionsService } from '../Services/transactions.service';

@Component({
  selector: 'app-create-nft',
  templateUrl: './create-nft.component.html',
  styleUrls: ['./create-nft.component.css']
})
export class CreateNFTComponent implements OnInit {
  //UI elements 
  uploadIcon = faCaretSquareUp;
  optionsIcon = faCog;
  mintButton = faArrowAltCircleRight;
  moreOptions = false;
  errorMessage: null | string = null;
  formValidityForUI: boolean = false;
  //UI elements 

  //  validAddress: boolean = true;

  haveFile: boolean = false;
  filename: string = "";
  account: string | null = null;
  nftForm: FormGroup = new FormGroup({
    name: new FormControl(''),
    owner: new FormControl('', Validators.required),
    chainId: new FormControl('', Validators.required),
    file: new FormControl('', Validators.required)
  });

  chainId: number | null = null;
  file: File | null = null;
  nft: any = {};
  loading: boolean = false;
  networkSubscription: Subscription | null = null;
  accountSubscription: Subscription | null = null;
  constructor(private _walletService: WalletService,
    private nftManager: NFTManagerService, private router: Router,
    private fileManager: FileManagerService,
    private _profile: ProfileService, private dialog: MatDialog,
    public snackBar: MatSnackBar, private _transactions:TransactionsService) {

  }

  ngOnInit(): void {
    this.accountSubscription =  this._walletService.listenForAccount()
      .subscribe((account) => {
      if (account) {
        this.account = account;
        this.nftForm.controls['owner'].setValue(account);
      }
    });
    this.networkSubscription = this._walletService.getNetwork()
      .subscribe((currentNetwork) => {
      this.chainId = currentNetwork;
      if (currentNetwork) {
        if (getProvider(currentNetwork)) {
          this.nftForm.controls['chainId'].setValue(currentNetwork.toString());
          this.isValidForm();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.networkSubscription?.unsubscribe();
    this.accountSubscription?.unsubscribe();
  }
  /**
   * for the UI button if there is no account
   */
  public initAccount(): void {
    this.dialog.open(LoginComponent, {height:"500px", width:"400px"});
  }



  /**
   * this is called if 
   * populateNFT(formInput)=> NFT
   * 
   */
  public createNFT(): void {
    this.nft.name = this.nftForm.get('name')?.value;
    this.nft.owner = this.nftForm.get('owner')?.value;
    this.nft.chainId = parseInt(this.nftForm.get('chainId')?.value);
    this.nft.tokenId = this.generateTokenId();
    this.nft.creator = this._walletService.account;
    this.nft.contractAddress = getContractAddress(this.nft.chainId, "nft");

    this.mint(this.nft);
  }

  private mint(nft: NFT) {
    this.loading = true;
    this.nftManager.mintNFT(nft)//add a please wait thing
      .then((transactionHash: string) => {
        if (transactionHash && nft) {
          this._profile.openSnackBar("Transaction Hash Created, uploading file now.", 4000,false);
          console.log("CreateNFT: transactionHash ", transactionHash);
          this._transactions.verifyTransactionHash(nft, transactionHash)
            .then((success) => {
              if (success) {
                if (this.file) {
                  this.nftManager.uploadNFT(nft, this.file)
                    .subscribe((success: boolean) => {
                      console.log("status is ", success);
                      if (success) {
                        this.loading = false;
                        this.router.navigate(['nft-results']);
                      }
                    });
                }
                
              }
              else {
                this.loading = false;
                this._profile.openSnackBar("something went wrong");
              }
            })
            .catch((err) => {
              this._profile.openSnackBar(err.message);
            });
         
          
        }
      })
      .catch((err: any) => {
        this._profile.openSnackBar(err.message);
        this.loading = false;
      });
  }

  /**
   * populateNFT(file, NFT)=>NFT
   * @param {Event} event 
   * @returns {void}
   */
  public handleFile(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.file = target.files[0];
      this.filename = this.file.name;
      //do more validation
      if (this.file.size > 0) {
        this.fileManager.hashFile(this.file)
          .then((hash) => {
            this.nft.contentHash = hash;
          })
          .catch((error: any) => {
            alert(error.message);
          });
        this.haveFile = true;
      }
    }

  }

  public options(): void {
    this.moreOptions = !this.moreOptions;
  }

  /**
   * populateNFT(random)=> NFT.tokenId
   * @returns {string} tokenId
   */
  private generateTokenId(): string {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const bytesHex = bytes
      .reduce((o, v) => o + ('00' + v.toString(16)).slice(-2), '');
    return "0x" + BigInt('0x' + bytesHex).toString(16);
  }

  private validAddress(): boolean {
    let address: string = this.nftForm.get('owner')?.value;
    if (address) {
      let validityCheck = this._walletService.isValidAddress(address, 'ETH');
      if (validityCheck) {
        this.errorMessage = null
        return true;
      }
      else {
        this.errorMessage = "invalid address";
        return false;
        
      }
    }
    else {
      return false;
    }
  }

  public isValidForm(): boolean {
    if (this.validAddress() && this.validFile()
      && this.account && this.validChain()) {
      this.formValidityForUI = true;
      return true;
    }
    else {
      this.formValidityForUI = false;
      return false;
    }
  }

  private validFile(): boolean {
    return this.haveFile;
  }

  /**
   * walletChain == formChain
   * @returns {boolean}
   */
  private validChain(): boolean { 
    let formChainId: number = parseInt(this.nftForm.get('chainId')?.value);
    if (this.nft) {
      if (this.chainId == formChainId) {
        console.log("is truee");
        return true;
      }
      else {
        return false;
      }
    }
    else {
      return false;
    }
  }

}
