import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GalleryComponent } from './gallery/gallery.component';
import { ProfileComponent } from './profile.component';

const routes: Routes = [
  {
    path: '', component: ProfileComponent,
   
    children: [
      {
        path: "",
        component:GalleryComponent
      }
    ]
  }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
