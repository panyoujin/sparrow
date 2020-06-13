import * as path from 'path';
import * as fsExtra from 'fs-extra';
import generate from '@babel/generator';
import {initBlock, blockList} from '../fragment/scene';
import * as cheerio from 'cheerio';
import * as prettier from 'prettier';
import * as upperCamelCase from 'uppercamelcase';
import VueGenerator from '../generator';
import VueParse from '../generator/VueParse';
const uuid = require('@lukeed/uuid');
import Config from '../../config';
import Box from '../box/Box';

const cwd = process.cwd();
const viewPath = path.join(cwd, '..', 'sparrow-view/src/views/index.vue')

export default class Scene {
  components: any = [];
  methods: any;
  mixins: any;
  templateFilePath: string;
  templateData: any;
  scriptData: any;
  $: any;
  boxInstance: any;
  VueGenerator: any;
  sceneVueParse: any = null;
  params: any = {
    previewViewStatus: 0
  };
  tree: any;

  constructor (params: any = {}) {
    this.VueGenerator = new VueGenerator();
    this.init();

    const {boxs, name} = params;
    if (name) {
      const fileStr = fsExtra.readFileSync(path.join(Config.templatePath,'scene', name,'index.vue'), 'utf8');
      this.sceneVueParse = new VueParse(uuid().split('-')[0], fileStr);
    }
    // if (boxs && boxs.length) {
    //   boxs.forEach(item => {
    //     this.initBox(item);
    //   });
    //   this.renderPage();
    // }
  }

  private async init () {
    const templateStr =  `
      <template>
        <div class="home">
        </div>
      </template>
    `;
    this.$ = cheerio.load(templateStr, {
      xmlMode: true,
      decodeEntities: false
    });
    this.scriptData = this.VueGenerator.initScript();
    this.components.push(new Box());
    this.renderPage();
  }

  // public initBox (data: any) {
  //   const curData = data.data;
  //   const { boxIndex } = curData;
  //   const dynamicObj = require(`../box/${curData.id}`).default;
  //   if (this.components[boxIndex] === undefined) {
  //     this.components.push(new dynamicObj(curData));
  //   } else {
  //     this.components[boxIndex] = new dynamicObj(curData);
  //   }
  // }
  
  public findBox (uuid: string, boxs: any) {
    let tempBox = null;

    const fn = function (uuid, boxs) {
      if (tempBox === null) {
        if (Array.isArray(boxs)) {
          boxs.forEach(item => {
            if (item.uuid === uuid) {
              tempBox = item;
            }

            if (
              item.name === 'box' 
              && item.components[0] 
              && item.components[0].components
            ) {
              fn(uuid, item.components[0].components)
            }
          });
        } else {
          Object
          .keys(boxs)
          .forEach(key => {
            if (Array.isArray(boxs[key])) {
              fn(uuid, boxs[key]);
            }
          })
        }

        /**
         *  else if (boxs.uuid) {
              if(boxs.uuid === uuid) {
                tempBox = boxs;
              }
            }
         */
      }
    }

    fn(uuid, boxs);
    return tempBox;
  }

  public findBoxParent (uuid: string, boxs: any) {
    let tempBox = null;

    const fn = function (uuid, boxs) {
      if (tempBox === null) {
        if (Array.isArray(boxs)) {
          boxs.forEach(item => {
            if (item.uuid === uuid) {
              tempBox = boxs;
            }

            if (item.name === 'box' && item.components[0] && item.components[0].components && tempBox === null) {
              fn(uuid, item.components[0].components)
            }
          });
        } else {
          Object
          .keys(boxs)
          .forEach(key => {
            if (Array.isArray(boxs[key])) {
              fn(uuid, boxs[key]);
            }
          })
        }
      }
    }

    fn(uuid, boxs);
    return tempBox;
  }


  // public bottomBox (params: any) {
  //   const { data } = params;
  //   const boxIndex = data.boxIndex;
  //   if (this.components.length > boxIndex + 1) {
  //     const temp = this.components[boxIndex];
  //     this.components[boxIndex] = this.components[boxIndex + 1];
  //     this.components[boxIndex + 1] = temp;
  //     this.renderPage();
  //   }
  // }

  // public removeBox (params: any) {
  //   const { data } = params;
  //   this.components.splice(data.boxIndex, 1);
  //   this.renderPage();
  // }

  // public async topBox (params: any) {
  //   const { data } = params;
  //   const boxIndex = data.boxIndex;
  //   if (boxIndex > 0) {
  //     const temp = this.components[boxIndex];
  //     this.components[boxIndex] = this.components[boxIndex - 1];
  //     this.components[boxIndex - 1] = temp;
  //     this.renderPage();
  //   }
  // }

  public addBox (params: any) {
    const {boxUuid, data} = params;
    if (boxUuid) {
      const currBox = this.findBox(boxUuid, this.components);
      currBox.addComponent(data);
      const curBoxParent = this.findBoxParent(boxUuid, this.components)
      curBoxParent.push(new Box());
      this.renderPage();
    }
  }

  public addComponent (params) {
    const { data, boxUuid} = params;
    const currBox = this.findBox(boxUuid, this.components);
    if (currBox) {
      currBox.components[0].addComponent(data);
      this.renderPage();
    }
  }

  public async addBlock (params, ctx) {
    const {data, boxUuid} = params;
    if (boxUuid) {
      const currBox = this.findBox(boxUuid, this.components);
      await currBox.components[0].addBlock(data);
      this.renderPage();
    }

    const { socket } = ctx;
    socket.emit('generator.scene.block.status', {status: 0, data: {
      status: 2,
      message: 'complete',
    }});
  }


  public async setting (params: any) {

    const { data, boxUuid} = params;
    const curBox = this.findBox(boxUuid, this.components);
    if (curBox && curBox.components[0]) {
      await curBox.components[0].setting(data);
      return {
        status: 0
      }
    }

    return {
      status: 1
    }
  }

  public async settingConfig (params: any) {
    const {data} = params;
    const currentComp = this.findComponent(data.uuid, this.components);
    if (currentComp) {
      currentComp.settingConfig(data);
    }
  }

  private findComponent (uuid, components) {
    let tempComp = null;

    const fn = function (uuid, components) {
      if (tempComp === null) {
        if (Array.isArray(components)) {
          components.forEach(item => {
            if (item.uuid === uuid) {
              tempComp = item;
            }
  
            if (item.components && tempComp === null) {
              fn(uuid, item.components)
            }
          });
        } else {
          if(components.uuid === uuid) {
            tempComp = components;
          }
        }
      }
    }

    fn(uuid, components);
    return tempComp;
  }

  public getSetting (params) {
    const { boxUuid } = params;
    
    const curBox = this.findBox(boxUuid, this.components);
    if (curBox && curBox.components[0]) {
      return curBox.components[0].getSetting()
    }
  }

  public getBoxChildConfig (params) {
    const {boxUuid} = params;
    const curBox = this.findBox(boxUuid, this.components);
    if (curBox && curBox.components[0] && curBox.components[0].getBoxChildConfig) {
      return curBox.components[0].getBoxChildConfig(params);
    }
  }

  public getParams () {
    return this.params;
  }

  public getSceneTree (node) {
    this.tree = {
      label: 'page',
      children: []
    };

    this.components.forEach(item => {
      this.tree.children.push(this.getTree(item));
    });

    return this.tree;
  }

  private getTree (node) {
    if (!node) return null;
    const tree = {
      label: '',
      id: '',
      children: []
    };
    if (node.name) {
      tree.label = node.name;
    }
    if (node.uuid) {
      tree.id = node.uuid
    }


    if (node.components || node.boxs) {
      if (node.components) {
        if (Array.isArray(node.components)) {
          node.components.forEach(node => {
            tree.children.push(this.getTree(node));
          })
        } else {
          Object
            .keys(node.components)
            .forEach((key, index) => {
              tree.children.push(this.getTree({
                name: 'column',
                id: key,
                components: node.components[key]
              }));
            });
        }
      } 
      if(node.boxs) {
        // 容器树
        node.boxs.forEach(node => {
          tree.children.push(this.getTree(node));
        });
      }
      
    } else {
      this.getTree(null);
    }

    return tree;
  }

  private deleteNode (node, id, flag = 0) {
    if (!node || !node.uuid) {
      return;
    }
    flag = 0;
    if (node.components || node.boxs) {

      if (node.components) {

        if (Array.isArray(node.components)) {
          node.components.forEach((item, index) => {
            if (item.uuid === id) {
              index = index;
              node.components.splice(index, 1);
              flag = 1;      
            }
            if (flag === 0) {
              this.deleteNode(item, id, flag);
            } 
          });
        } else {
          let index = null;
          Object
            .keys(node.components)
            .forEach(key => {
              node.components[key] && node.components[key].forEach((item, index) => {
                if (item.uuid === id) {
                  index = index
                  flag = 1;
                  node.components[key].splice(index, 1);
                }
                if (flag === 0) {
                  this.deleteNode(item, id, flag);
                } 
              });
            });
        }
        
      } else {
        node.boxs.forEach((item, index) => {
          if (item.uuid === id) {
            index = index;
            node.boxs.splice(index, 1);
            flag = 1; 
          }
          if (flag === 0) {
            this.deleteNode(item, id, flag);
          } 
        });
      }
    } else {
      this.deleteNode(null, '');
    }
  };
  
  public deleteComponent (params: {id: string}) {
    const {id} = params;
    this.deleteNode({
      uuid: 'page',
      components: this.components
    }, id);
    this.renderPage();
  }

  public async renderPage (renderType: number = 0) {
    this.params.previewViewStatus = renderType;
    this.$('.home').empty();
    this.scriptData = this.VueGenerator.initScript();
    let methods = [];
    const fn = (boxs, flag = 0) => {
      boxs.map((item, index) => {
        if (item.name !== 'box') return;
        if (flag === 0) {
          item.setPreview && item.setPreview(renderType);
          const blockListStr = blockList(index, item.getFragment(index, renderType).html());
          this.$('.home').append(blockListStr);
        }

        item = item.components[0] || {};
  
        if (item.insertComponents && item.insertComponents.length) {
          this.VueGenerator.appendComponent(upperCamelCase(item.insertComponents[0]));
        }
  
        if (item.type === 'inline') {
          if (item.components) {
            item.components.forEach(comp => {
              if (comp.vueParse) {
                methods = methods.concat(comp.vueParse.methods || []);
              }
            });
          }
          if (item.components && item.components.length > 0) {
            fn(item.components, 1)
          }
        }
  
        if (item.vueParse) {
          item.vueParse.methods && this.VueGenerator.appendMethods(item.vueParse.methods);
          item.vueParse.data && this.VueGenerator.appendData(item.vueParse.data);
        }
  
      });
    }

    fn(this.components);
    
    if (this.sceneVueParse) {
      this.sceneVueParse.methods && this.VueGenerator.appendMethods(this.sceneVueParse.methods);
      this.sceneVueParse.data && this.VueGenerator.appendData(this.sceneVueParse.data);
      this.VueGenerator.appendMethods(methods);
    }
    this.writeTemplate();
  }

  private writeTemplate () {
    const template = `${this.$.html()}\n<script>${generate(this.scriptData).code}</script>`;
    const formatTemp = prettier.format(template, { semi: true, parser: "vue" });
    fsExtra.writeFile(viewPath, formatTemp, 'utf8');
  }
}