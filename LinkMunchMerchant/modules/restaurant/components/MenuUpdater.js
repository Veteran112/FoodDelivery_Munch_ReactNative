import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import ItemEditor from './subcomponents/MenuEditor/ItemEditor/ItemEditor';
import { Icon, Text, Button, CheckBox } from 'react-native-elements';
import { Auth } from 'aws-amplify';
import { RFValue } from 'react-native-responsive-fontsize';
import { SwipeListView } from 'react-native-swipe-list-view';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Swipeout from 'react-native-swipeout';
import { Alert } from 'react-native';
import { Switch } from '@rneui/themed';
import CategoryEditor from './subcomponents/MenuEditor/CategoryEditor/CategoryEditor';
//TODO: store menu locally for faster loading
const stage = 'beta';
//This menu variable is for testing, actual menu should be loaded in
var menu
//todo: display list https://react-native-elements.github.io/react-native-elements/docs/listitem.html
// use section: ListItem implemented with custom View for Subtitle
const Stack = createStackNavigator();
let menuCategoryList = []


export default class MenuUpdater extends React.Component {
  constructor(props) {
    super(props);
    var itemList = JSON.parse(props.route.params.data.menu_items);
    // itemList = itemList.filter(function (item) {
    //   return item.item_name != '' && item.item_description != '' && item.item_price != '';
    // });
    itemList = itemList.filter(function (item) {
      return item.item_name != '' && item.item_price != '';
    });
    menu = itemList; // props.route.params.data.menu_items;
    menuCategoryList = props.route.params.menuCategories

    this.state = { menu: menu, navigation: props.navigation, menuCategories: menuCategoryList };
  }

  componentDidUpdate() {
    this.props.route.params.data.menu_items = menu
  }

  editMenu = newMenu => {
    this.setState({ menu: newMenu });
  };

  render() {
    return (
      <Stack.Navigator initialRouteName="Menu">
        <Stack.Screen
          name="Menu"
          component={MenuList}
          key={menu.length}
          initialParams={{
            menu: menu ? typeof menu == 'object' ? menu : JSON.parse(JSON.stringify(menu)) : {},
            needsUpdate: false,
            updatedData: menu ?? [],
            menuCategories: menuCategoryList
          }} //make sure that on navigation to menu we check needsUpdate
          options={({ navigation, route }) => ({
            headerRight: props => (
              <Button
                icon={<Icon name="create" size={15} color="#D65344" />}
                title="Add Item"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#D65344' }}
                type="clear"
                onPress={() => {
                  let newMenu = JSON.parse(JSON.stringify(route.params.menu));
                  navigation.navigate('ItemEditor', {
                    menuItems: route.params.updatedData ?? [],
                    menuCategories: menuCategoryList
                  });
                }}
              />
            ),
            headerTitleStyle: {
              fontSize: 17,
              fontWeight: "600"
            },
            headerTitleAlign: 'center',
            cardStyle: { backgroundColor: '#fff' }
          })}
        />
        <Stack.Screen
          name="ItemEditor"
          component={ItemEditor}
          options={({ navigation, route }) => ({
            title: route.params.item ? 'Edit Menu Item' : 'Add Menu Item',
            headerBackTitle: 'Discard Changes',
            headerTitleAlign: 'center',
            headerLeft: props => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#D65344"
                  />
                }
                title="Back"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#D65344' }}
                type="clear"
                onPress={() => {
                  Alert.alert(
                    'Unsaved Changes',
                    'Are you sure you want to cancel any changes made?',
                    [
                      {
                        text: 'Ok',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                      { text: 'Cancel' },
                    ],
                  );
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="CategoryEditor"
          component={CategoryEditor}
          options={({ navigation, route }) => ({
            title: 'Modify Menu Categories',
            headerBackTitle: 'Discard Changes',
            headerTitleAlign: 'center',
            headerLeft: props => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#D65344"
                  />
                }
                title="Back"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#D65344' }}
                type="clear"
                onPress={() => {
                  Alert.alert(
                    'Unsaved Changes',
                    'Are you sure you want to cancel any changes made?',
                    [
                      {
                        text: 'Ok',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                      { text: 'Cancel' },
                    ],
                  );
                }}
              />
            ),
          })}
        />
      </Stack.Navigator>
    );
  }
}

function MenuList({ navigation, route }) {
  const [items, setItems] = useState(route.params.updatedData);
  const [menuCategories, setMenuCategories] = useState(route.params.menuCategories);

  React.useEffect(() => {
    // Updating backend when navigation is changed back to menu page
    navigation.addListener('focus', () => {
      if (route.params.needsUpdate) {
        menu = route.params.updatedData
        navigation.setParams({
          needsUpdate: false,
        });
        console.log("useEffect has been touched");
        setItems(route.params.updatedData);
        updateMenu(route.params.updatedData);
        menuCategoryList = route.params.menuCategories
        setMenuCategories(route.params.menuCategories)
        //call the api gateway endpoint (eventually with contigo authentication) to update menu
      }
    })
    // Used for updating backend when navigation does not change
    if (route.params.needsUpdate) {
      navigation.setParams({
        needsUpdate: false,
      });
      setItems(route.params.updatedData)
      updateMenu(route.params.updatedData);
      setMenuCategories(route.params.menuCategories)
      //call the api gateway endpoint (eventually with contigo authentication) to update menu
    }
  });

  return (
    <>
      <View style={styles.headerSubtitleView}>
        <Text style={styles.headerSubtitle}>Swipe to Edit</Text>
      </View>
      <SwipeListView
        style={styles.listContainer}
        data={items ?? []}
        key={items.length}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) =>
          <View>
            <MenuItem
              item={item}
              index={index}
              route={route}
              navigation={navigation}
              edit={() =>
                navigation.navigate('ItemEditor', {
                  index,
                  item,
                  menuItems: items ?? [],
                  menuCategories: menuCategoryList
                })
              }
            />
          </View>
        }
        keyExtractor={(item, index) => index + ''}
      />
    </>
  );
}

async function updateMenu(newMenu) {
  let info = await Auth.currentUserInfo();

  const body = JSON.stringify({
    'restaurant-id': info.attributes.sub,
    menu: JSON.stringify(newMenu),
  });
  const response = await fetch(
    'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/' +
    stage +
    '/restaurants/updateMenu',
    {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: body, // body data type must match "Content-Type" header
    },
  );

  console.log('resdata', response.json());
}

var MenuItem = ({ item, index, route, editable, navigation, onUpdate, onDelete, edit }) => {
  const [items, setItems] = useState(route.params.updatedData);
  var [toggleCheckBox, setToggleCheckBox] = useState(items[index].available);

  const updateItem = (index, newValue) => {
    let newdata = items;
    newdata[index].unavailable = !newValue;
    newdata[index].available = newValue;
    setItems(newdata);
    updateMenu(newdata);
    menu = newMenu
    navigation.setParams({ updatedData: newdata, needsUpdate: true });
  };

  const rightButtons = [
    {
      component: (
        <TouchableOpacity
          onPress={edit}
          style={styles.editBtn}
        >
          <Button
            icon={<Icon
              name='edit'
              type='material'
              size={35}
              color="#ffffff"
              style={{ left: 0 }}
              onPress={edit}
            />}
            type='clear'
          />
        </TouchableOpacity>)
    },
    {
      component: (
        <View style={styles.unavailable}>
          <Switch
            color="#4BAD38"
            value={toggleCheckBox}
            onValueChange={(newValue) => {
              setToggleCheckBox(newValue);
              updateItem(index, newValue);
            }}
          />
          <Text
            style={{
              marginLeft: 0,
              fontSize: 12,
              fontWeight: '800',
              color: 'white'
            }}
          >
            Available
          </Text>
        </View>
      )
    }
  ];

  return (
    <Swipeout backgroundColor='#D65344' style={{ marginBottom: 10, borderRadius: 5 }} right={rightButtons}>
      <TouchableOpacity style={styles.menuItem}>
        {editable && (
          <View>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <CheckBox value={item["itemAvailable"]} />
              <Text>UNAVAILABLE</Text>
            </View>
          </View>
        )}
        
        <Image
          source={{ uri: `${item["picture"]}?update=${new Date().getSeconds()}` }}
          style={{ width: wp('30'), height: wp('30'), borderRadius: 15, marginLeft: 0, marginRight: 20, }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitleText}>{item["item_name"]}</Text>
          <Text style={styles.menuPriceText}>${item["item_price"]}</Text>
          <Text style={styles.item}>{item["item_description"]}</Text>
        </View>
      </TouchableOpacity>
    </Swipeout>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
  },
  titles: {
    textAlign: 'center',
    color: '#03a5fc',
    padding: 10,
  },
  headerSubtitleView: {
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#F66B00'
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600'
  },
  categoryEditorButton: {
    color: '#03a5fc',
  },
  menuListView: {
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  addCategoryIcon: {
    position: 'absolute',
    right: 0,
  },
  itemcontainer: {
    backgroundColor: 'white',
    borderColor: 'pink',
    borderWidth: 1,
    padding: 10,
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemtitle: {
    color: '#03a5fc',
    fontSize: RFValue(14, 580),
  },
  itemdescription: {
    color: 'black',
  },
  itemprice: {
    color: '#D65344',
  },
  itempicture: {},
  options: {
    borderColor: 'pink',
    borderWidth: 1,
    flex: 1,
    padding: 10,
    marginLeft: 15,
  },
  optionitem: {
    borderColor: 'pink',
    borderWidth: 1,
    flex: 1,
    padding: 10,
    marginBottom: 10,
  },
  listitem: {
    borderColor: 'black',
    borderWidth: 1,
    flex: 1,
    padding: 5,
    marginBottom: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: 'white',
    padding: 10,
  },
  item: {
    fontSize: 15,
    marginBottom: 5,
    color: '#7D849A',
    alignItems: 'center',
  },
  headerTitleStyle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: "600"
  },
  menuTitleText: {
    color: 'black',
    fontSize: RFValue(13, 580),
    fontWeight: '500',
    marginBottom: 5,
  },
  menuPriceText: {
    fontSize: RFValue(13, 580),
    color: 'black',
    fontWeight: '300',
    marginBottom: 5,
  },
  editButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D65344',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#D65344',
  },
  editBtn: {
    backgroundColor: '#4BAD38',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderColor: 'white'
  },
  trashBtn: {
    backgroundColor: '#4BAD38',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5
  },
  trashIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  unavailable: {
    backgroundColor: '#F66B00',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderColor: 'white',
  },
});
