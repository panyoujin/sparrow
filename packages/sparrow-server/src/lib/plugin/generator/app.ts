import Scene from '../../adapter-vue'
import Data from '../../adapter-vue/data';
import Toolbar from '../../adapter-vue/modules/toolbar';
import * as rimraf from 'rimraf';
import * as util from 'util';
import Config from '../../adapter-vue/config';

const rimrafAsync = util.promisify(rimraf);

class generator{
  scene: any;
  data: any;
  toolbar: any;


  constructor () {
    this.data = new Data();
  }

  public ready() {
    this.scene = new Scene();
    this.toolbar = new Toolbar(this.scene);
    console.log(this.toolbar);
    this.toolbar.trash = this.trash.bind(this);
  }

  public async trash () {
    this.scene = new Scene();
    this.toolbar.resetScene(this.scene)
    await rimrafAsync(Config.componentsDir);
    return {
      status: 0
    };
  }
}

export default (app) => {
  app.beforeStart(async () => {
    app.generator = new generator();
    app.generator.ready();
  });
};